import { Worker, WorkerOptions } from 'worker_threads'
import { ApSemaphore, getEngineTimeout } from '@activepieces/server-shared'
import { ApEnvironment, assertNotNullOrUndefined, EngineOperation, EngineOperationType, EngineResponse, EngineResponseStatus } from '@activepieces/shared'
import { FastifyBaseLogger } from 'fastify'
import { workerMachine } from '../../utils/machine'

export type WorkerResult = {
    engine: EngineResponse<unknown>
    stdOut: string
    stdError: string
}


export class EngineWorker {
    workers: Worker[]
    availableWorkerIndexes: number[]
    lock: ApSemaphore
    enginePath: string
    engineOptions: WorkerOptions | undefined
    log: FastifyBaseLogger
    constructor(log: FastifyBaseLogger, maxWorkers: number, enginePath: string, engineOptions?: WorkerOptions) {
        this.log = log
        this.enginePath = enginePath
        this.engineOptions = engineOptions
        this.workers = []
        this.availableWorkerIndexes = []
        this.lock = new ApSemaphore(maxWorkers)

        // Create the initial workers
        for (let i = 0; i < maxWorkers; i++) {
            this.workers.push(new Worker(enginePath, engineOptions))
            this.availableWorkerIndexes.push(i)
        }
    }

    async executeTask(operationType: EngineOperationType, operation: EngineOperation): Promise<WorkerResult> {
        this.log.trace({
            operationType,
            operation,
        }, 'Executing operation')
        await this.lock.acquire()
        const workerIndex = this.availableWorkerIndexes.pop()
        this.log.debug({
            workerIndex,
        }, 'Acquired worker')
        assertNotNullOrUndefined(workerIndex, 'Worker index should not be undefined')
        const worker = this.workers[workerIndex]
        const environment = workerMachine.getSettings().ENVIRONMENT
        const timeout = getEngineTimeout(operationType, workerMachine.getSettings().FLOW_TIMEOUT_SECONDS, workerMachine.getSettings().TRIGGER_TIMEOUT_SECONDS)
        try {

            const result = await new Promise<WorkerResult>((resolve, reject) => {
                let stdError = ''
                let stdOut = ''

                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                const timeoutWorker = setTimeout(async () => {
                    resolve({
                        engine: {
                            status: EngineResponseStatus.TIMEOUT,
                            response: {},
                        },
                        stdError: '',
                        stdOut: '',
                    })
                    await worker.terminate()
                }, timeout * 1000)


                worker.on('message', (m: { type: string, message: unknown }) => {
                    if (m.type === 'result') {
                        cleanUp(worker, timeoutWorker)
                        resolve({
                            engine: m.message as EngineResponse<unknown>,
                            stdOut,
                            stdError,
                        })
                    }
                    else if (m.type === 'stdout') {
                        stdOut += m.message
                    }
                    else if (m.type === 'stderr') {
                        stdError += m.message
                    }
                })

                worker.on('error', () => {
                    cleanUp(worker, timeoutWorker)
                    this.workers[workerIndex] = new Worker(this.enginePath, this.engineOptions)
                    reject({ status: EngineResponseStatus.ERROR, response: {} })
                })

                worker.on('exit', () => {
                    this.log.error({
                        stdError,
                        stdOut,
                        workerIndex,
                    }, 'Worker exited')
                    cleanUp(worker, timeoutWorker)
                    this.workers[workerIndex] = new Worker(this.enginePath, this.engineOptions)
                })
                worker.postMessage({ operation, operationType })
            })
            return result
        }
        finally {
            if (environment === ApEnvironment.DEVELOPMENT) {
                try {
                    this.log.trace({
                        workerIndex,
                    }, 'Removing worker in development mode to avoid caching issues')
                    await worker.terminate()
                }
                catch (e) {
                    this.log.error({
                        error: e,
                    }, 'Error terminating worker')
                }
                this.workers[workerIndex] = new Worker(this.enginePath, this.engineOptions)
            }
            this.log.debug({
                workerIndex,
            }, 'Releasing worker')
            this.availableWorkerIndexes.push(workerIndex)
            this.lock.release()
        }
    }
}

function cleanUp(worker: Worker, timeout: NodeJS.Timeout): void {
    worker.removeAllListeners('exit')
    worker.removeAllListeners('error')
    worker.removeAllListeners('message')
    clearTimeout(timeout)
}
