import { useReactFlow } from '@xyflow/react';
import { t } from 'i18next';
import { Split } from 'lucide-react';
import { memo, useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import {
  flowHelper,
  FlowOperationType,
  isNil,
  RouterAction,
  RouterExecutionType,
} from '@activepieces/shared';

import { FormField, FormItem } from '../../../../components/ui/form';
import { Label } from '../../../../components/ui/label';
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from '../../../../components/ui/select';
import { useBuilderStateContext } from '../../builder-hooks';
import { flowCanvasUtils } from '../../flow-canvas/flow-canvas-utils';
import { BranchSettings } from '../branch-settings';

import { BranchesList } from './branches-list';
import BranchesToolbar from './branches-toolbar';

export const RouterSettings = memo(({ readonly }: { readonly: boolean }) => {
  const [
    step,
    applyOperation,
    setSelectedBranchIndex,
    selectedBranchIndex,
    setBranchDeletedCallback,
    setBranchDuplicateCallback,
  ] = useBuilderStateContext((state) => [
    flowHelper.getStep(state.flowVersion, state.selectedStep!)! as RouterAction,
    state.applyOperation,
    state.setSelectedBranchIndex,
    state.selectedBranchIndex,
    state.setBranchDeletedCallback,
    state.setBranchDuplicateCallback,
  ]);
  const { fitView } = useReactFlow();

  const { control, setValue, formState } =
    useFormContext<Omit<RouterAction, 'children' | 'nextAction'>>();

  const { insert, remove } = useFieldArray({
    control,
    name: 'settings.branches',
  });

  const deleteBranch = (index: number) => {
    applyOperation(
      {
        type: FlowOperationType.DELETE_BRANCH,
        request: {
          stepName: step.name,
          branchIndex: index,
        },
      },
      () => { },
    );
    remove(index);
    setSelectedBranchIndex(null);
    fitView(flowCanvasUtils.createFocusStepInGraphParams(step.name));
  };

  useEffect(() => {
    setBranchDeletedCallback((branchIndex, stepName) => {
      if (step.name === stepName) {
        remove(branchIndex);
      }
    });
    setBranchDuplicateCallback((branchIndex, branch, stepName) => {
      if (step.name === stepName) {
        insert(branchIndex + 1, branch);
      }
    });

    return () => {
      setBranchDeletedCallback(null);
      setBranchDuplicateCallback(null);
    };
  }, []);
  return (
    <>
      {isNil(selectedBranchIndex) && (
        <FormField
          control={control}
          name="settings.executionType"
          render={({ field }) => (
            <FormItem>
              <Label>{t('Execute')}</Label>
              <Select
                disabled={field.disabled}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Execute')} />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem
                    value={`${RouterExecutionType.EXECUTE_FIRST_MATCH}`}
                  >
                    {t('Only the first (left) matching branch')}
                  </SelectItem>
                  <SelectItem
                    value={`${RouterExecutionType.EXECUTE_ALL_MATCH}`}
                  >
                    {t('All matching paths')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        ></FormField>
      )}

      {isNil(selectedBranchIndex) && (
        <div className="mt-4">
          <div className="flex gap-2 mb-2 items-center">
            <Split className="w-4 h-4 rotate-180"></Split>
            <Label>{t('Branches')}</Label>
          </div>

          <BranchesList
            errors={(formState.errors.settings?.branches as unknown[]) ?? []}
            readonly={readonly}
            step={step}
            branchNameChanged={(index, name) => {
              setValue(`settings.branches[${index}].branchName`, name);
            }}
            deleteBranch={deleteBranch}
            duplicateBranch={(index) => {
              applyOperation(
                {
                  type: FlowOperationType.DUPLICATE_BRANCH,
                  request: {
                    stepName: step.name,
                    branchIndex: index,
                  },
                },
                () => { },
              );

              insert(index + 1, {
                ...step.settings.branches[index],
                branchName: `${step.settings.branches[index].branchName} Copy`,
              });
              setSelectedBranchIndex(index + 1);
            }}
            setSelectedBranchIndex={(index) => {
              setSelectedBranchIndex(index);
              if (step.children[index]) {
                fitView(
                  flowCanvasUtils.createFocusStepInGraphParams(
                    step.children[index].name,
                  ),
                );
              } else {
                fitView(
                  flowCanvasUtils.createFocusStepInGraphParams(
                    `${step.name}-big-add-button-${step.name}-branch-${index}-start-edge`,
                  ),
                );
              }
            }}
          ></BranchesList>
          {!readonly && (
            <div className="mt-2">
              <BranchesToolbar
                addButtonClicked={() => {
                  applyOperation(
                    {
                      type: FlowOperationType.ADD_BRANCH,
                      request: {
                        stepName: step.name,
                        branchIndex: step.settings.branches.length - 1,
                      },
                    },
                    () => { },
                  );

                  insert(
                    step.settings.branches.length - 1,
                    flowHelper.createEmptyPath(step.settings.branches.length),
                  );
                  setSelectedBranchIndex(step.settings.branches.length - 1);
                }}
              ></BranchesToolbar>
            </div>
          )}
        </div>
      )}

      {!isNil(selectedBranchIndex) && (
        <BranchSettings
          readonly={readonly}
          key={`settings.branches[${selectedBranchIndex}].conditions`}
          fieldName={`settings.branches[${selectedBranchIndex}].conditions`}
        ></BranchSettings>
      )}
    </>
  );
});

RouterSettings.displayName = 'RouterSettings';