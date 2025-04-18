import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    Box,
} from '@mui/material';
import { AliceTask, PopulatedTask, TaskComponentProps, TaskType } from '../../../../types/TaskTypes';
import { ApiType } from '../../../../types/ApiTypes';
import { Prompt } from '../../../../types/PromptTypes';
import { AliceAgent } from '../../../../types/AgentTypes';
import EnhancedSelect from '../../../common/enhanced_select/EnhancedSelect';
import PromptShortListView from '../../prompt/prompt/PromptShortListView';
import AgentShortListView from '../../agent/agent/AgentShortListView';
import TaskShortListView from './TaskShortListView';
import TaskEndCodeRoutingBuilder from '../../../common/task_end_code_routing/TaskEndCodeRoutingBuilder';
import FunctionDefinitionBuilder from '../../../common/function_select/FunctionDefinitionBuilder';
import GenericFlexibleView from '../../../common/enhanced_component/FlexibleView';
import TaskFlowchart from '../../../common/task_flowchart/FlowChart';
import ExitCodeManager from '../../../common/exit_code_manager/ExitCodeManager';
import DataClusterManager from '../../data_cluster/data_cluster_manager/DataClusterManager';
import { TextInput } from '../../../common/inputs/TextInput';
import { NumericInput } from '../../../common/inputs/NumericInput';
import { BooleanInput } from '../../../common/inputs/BooleanInput';
import { SelectInput } from '../../../common/inputs/SelectInput';
import { formatCamelCaseString } from '../../../../utils/StyleUtils';
import { useApi } from '../../../../contexts/ApiContext';
import TitleBox from '../../../common/inputs/TitleBox';
import ApiValidationManager from '../../api/ApiValidationManager';
import UserCheckpointManager from '../../user_checkpoint/UserCheckpointManager';
import { getDefaultTaskForm, taskDescriptions } from '../../../../utils/TaskUtilts';

const TaskFlexibleView: React.FC<TaskComponentProps> = ({
    item,
    onChange,
    mode,
    handleSave,
    handleDelete,
}) => {
    const { fetchPopulatedItem } = useApi();
    const [taskType, setTaskType] = useState<TaskType>(item?.task_type || TaskType.PromptAgentTask);
    const [form, setForm] = useState<Partial<PopulatedTask>>(item as PopulatedTask || getDefaultTaskForm(taskType));
    const [isSaving, setIsSaving] = useState(false);

    const isEditMode = mode === 'edit' || mode === 'create';
    const title = mode === 'create' ? 'Create New Task' : mode === 'edit' ? 'Edit Task' : 'Task Details';
    const saveButtonText = form._id ? 'Update Task' : 'Create Task';
    const availableNodes = useMemo(() => {
        if (!form.node_end_code_routing) return [];
        return Object.keys(form.node_end_code_routing);
    }, [form.node_end_code_routing]);

    useEffect(() => {
        if (isSaving) {
            handleSave();
            setIsSaving(false);
        }
    }, [isSaving, handleSave]);

    useEffect(() => {
        if (item && Object.keys(item).length !== 0) {
            setForm(item as PopulatedTask);
        }
    }, [item]);

    useEffect(() => {
        if (!item || Object.keys(item).length === 0) {
            onChange(getDefaultTaskForm(taskType));
        }
    }, [item, onChange, taskType]);

    useEffect(() => {
        if (item?.task_type) {
            setTaskType(item.task_type);
        } else if (!item || Object.keys(item).length === 0) {
            const defaultForm = getDefaultTaskForm(taskType);
            setForm(defaultForm);
            onChange(defaultForm);
        }
        // eslint-disable-next-line
    }, [item?.task_type, taskType, onChange]);

    const handleFieldChange = useCallback((field: keyof AliceTask, value: any) => {
        if (field === 'task_type') {
            // When task type changes, create a new form with defaults for that type
            const defaultForm = getDefaultTaskForm(value as TaskType);
            // Preserve the task name and description if they exist
            const newForm = {
                ...defaultForm,
                task_name: form.task_name,
                task_description: form.task_description,
            };
            setTaskType(value as TaskType);
            setForm(newForm);
            onChange(newForm);
        } else {
            setForm(prevForm => ({ ...prevForm, [field]: value }));
        }
    }, [form.task_name, form.task_description, onChange]);

    const handleLocalSave = useCallback(async () => {
        onChange(form);
        setIsSaving(true);
    }, [form, onChange]);

    const handleLocalDelete = useCallback(() => {
        if (item && Object.keys(item).length > 0 && handleDelete) {
            handleDelete(item);
        }
    }, [item, handleDelete]);

    const handlePromptSelect = useCallback(async (selectedIds: Prompt[]) => {
        if (selectedIds.length > 0) {
            setForm(prevForm => ({ ...prevForm, templates: { ...form.templates, task_template: selectedIds[0] } }));
        } else {
            setForm(prevForm => ({ ...prevForm, templates: { ...form.templates, task_template: null } }));
        }
    }, [form.templates]);

    const handleOutputPromptSelect = useCallback(async (selectedIds: Prompt[]) => {
        if (selectedIds.length > 0) {
            setForm(prevForm => ({ ...prevForm, templates: { ...prevForm.templates, output_template: selectedIds[0] } }));
        } else {
            setForm(prevForm => ({ ...prevForm, templates: { ...prevForm.templates, output_template: null } }));
        }
    }, []);

    const handleAgentSelect = useCallback(async (selectedIds: AliceAgent[]) => {
        if (selectedIds.length > 0) {
            setForm(prevForm => ({ ...prevForm, agent: selectedIds[0] }));
        } else {
            setForm(prevForm => ({ ...prevForm, agent: null }));
        }
    }, []);

    const handleTaskSelect = useCallback(async (selectedIds: PopulatedTask[]) => {
        const tasksObject = selectedIds.reduce((acc, task) => {
            acc[task.task_name] = task;
            return acc;
        }, {} as Record<string, PopulatedTask>);
        setForm(prevForm => ({ ...prevForm, tasks: tasksObject }));
    }, []);

    const memoizedPromptSelect = useMemo(() => (
        <EnhancedSelect<Prompt>
            componentType="prompts"
            EnhancedView={PromptShortListView}
            selectedItems={form?.templates?.task_template ? [form.templates.task_template] : []}
            onSelect={handlePromptSelect}
            isInteractable={isEditMode}
            label="Select Input Template"
            description='The prompt template that will be used to structure the task input. Used in Agent tasks like PromptAgentTask'
            showCreateButton={true}
        />
    ), [form?.templates?.task_template, isEditMode, handlePromptSelect]);

    const memoizedOutputPromptSelect = useMemo(() => (
        <EnhancedSelect<Prompt>
            componentType="prompts"
            EnhancedView={PromptShortListView}
            selectedItems={form?.templates?.output_template ? [form.templates.output_template] : []}
            onSelect={handleOutputPromptSelect}
            isInteractable={isEditMode}
            label="Select Output Prompt"
            description='The prompt template that will be used to structure the task output. Can be used in any task type.'
            showCreateButton={true}
        />
    ), [form?.templates?.output_template, isEditMode, handleOutputPromptSelect]);

    const memoizedCodePromptSelect = useMemo(() => (
        <EnhancedSelect<Prompt>
            componentType="prompts"
            EnhancedView={PromptShortListView}
            selectedItems={form?.templates?.code_template ? [form.templates.code_template] : []}
            onSelect={handleOutputPromptSelect}
            isInteractable={isEditMode}
            label="Select Output Prompt"
            description='This prompt can be used to pass extra code blocks during execution. Important when developing a snippet that depends on another piece of code. Ensure the code is in a proper code block.'
            showCreateButton={true}
        />
    ), [form?.templates?.code_template, isEditMode, handleOutputPromptSelect]);

    const memoizedAgentSelect = useMemo(() => (
        <EnhancedSelect<AliceAgent>
            componentType="agents"
            EnhancedView={AgentShortListView}
            selectedItems={form?.agent ? [form.agent] : []}
            onSelect={handleAgentSelect}
            isInteractable={isEditMode}
            label="Select Agent"
            description='The agent responsible for this task. Used in Agent tasks like PromptAgentTask, ImageGenerationTaks, CodeGenerationTask and CheckTask, amongst others. The models this agent has will be used when executing the task.'
            showCreateButton={true}
        />
    ), [form?.agent, isEditMode, handleAgentSelect]);

    const memoizedTaskSelect = useMemo(() => (
        <EnhancedSelect<PopulatedTask>
            componentType="tasks"
            EnhancedView={TaskShortListView}
            selectedItems={Object.values(form?.tasks || {})}
            onSelect={handleTaskSelect}
            isInteractable={isEditMode}
            multiple
            label="Select Tasks"
            description='The tasks that will be executed, if the task type is Workflow. Otherwise, these tasks are passed to agents as tools'
            showCreateButton={true}
        />
    ), [form?.tasks, isEditMode, handleTaskSelect]);
    const memoizedUserCheckpointManager = useMemo(() => (
        <UserCheckpointManager
            userCheckpoints={form.user_checkpoints || {}}
            availableNodes={availableNodes}
            onChange={(checkpoints) => handleFieldChange('user_checkpoints', checkpoints)}
            isEditMode={isEditMode}
            fetchPopulatedItem={fetchPopulatedItem}
        />
    ), [form.user_checkpoints, availableNodes, handleFieldChange, isEditMode, fetchPopulatedItem]);

    const memoizedFlowchartTask = useMemo(() => ({
        ...form,
        start_node: form.start_node,
        node_end_code_routing: form.node_end_code_routing,
        tasks: form.tasks
        // eslint-disable-next-line
    }), [form.node_end_code_routing, form.tasks, form.start_node]);

    if (!form || Object.keys(form).length === 0) {
        return <Box>No task data available.</Box>;
    }

    return (
        <GenericFlexibleView
            elementType='Task'
            title={title}
            onSave={handleLocalSave}
            onDelete={handleLocalDelete}
            saveButtonText={saveButtonText}
            isEditMode={isEditMode}
            mode={mode}
            item={form as PopulatedTask}
            itemType='tasks'
        >
            <TitleBox title="Task Details" >
                <SelectInput
                    name="task_type"
                    label="Task Type"
                    value={taskType}
                    onChange={(value) => handleFieldChange('task_type', value)}
                    disabled={!isEditMode}
                    description={taskType && taskDescriptions[taskType] ? taskDescriptions[taskType].description : ''}
                    options={Object.values(TaskType).map((type) => ({ value: type, label: formatCamelCaseString(type) }))}
                />
                <TextInput
                    name="task_name"
                    label="Task Name"
                    value={form.task_name}
                    onChange={(value) => handleFieldChange('task_name', value)}
                    disabled={!isEditMode}
                    required
                    description="The display name of the task."
                    fullWidth
                />
                <TextInput
                    name="task_description"
                    label="Task Description"
                    value={form.task_description}
                    onChange={(value) => handleFieldChange('task_description', value)}
                    disabled={!isEditMode}
                    required
                    description="A description of the task. This info is provided to the agent."
                    fullWidth
                    rows={3}
                    multiline
                />
                <SelectInput
                    name="required_apis"
                    label="Required API Types"
                    value={form.required_apis || []}
                    onChange={(value) => handleFieldChange('required_apis', value)}
                    disabled={!isEditMode}
                    description='The API types that are required for this task to execute'
                    options={Object.values(ApiType).map((apiType) => ({ value: apiType, label: formatCamelCaseString(apiType) }))}
                    multiple
                />
                {form._id && (
                    <TitleBox title="API validation" >
                        <ApiValidationManager taskId={form._id} />
                    </TitleBox>
                )}
            </TitleBox>
            <FunctionDefinitionBuilder
                title="Input Variables"
                initialParameters={form.input_variables || undefined}
                onChange={(newDefinition) => handleFieldChange('input_variables', newDefinition)}
                isViewOnly={!isEditMode}
            />

            {memoizedAgentSelect}
            {memoizedTaskSelect}
            {memoizedPromptSelect}
            {memoizedOutputPromptSelect}
            {form.node_end_code_routing && memoizedUserCheckpointManager}
            {taskType === TaskType.CodeGenerationLLMTask && memoizedCodePromptSelect}
            <TaskEndCodeRoutingBuilder
                title="Inner Nodes End Code Routing"
                startNode={form.start_node}
                onChangeStartNode={(value) => handleFieldChange('start_node', value)}
                tasks={taskType === TaskType.Workflow ? Object.values(form.tasks ?? {}) : []}
                routing={form.node_end_code_routing || {}}
                onChange={(value) => handleFieldChange('node_end_code_routing', value)}
                isViewMode={!isEditMode}
                taskType={taskType}
            />
            {memoizedFlowchartTask && form.node_end_code_routing && (
                <TaskFlowchart title="Task Flowchart" task={memoizedFlowchartTask} height={800} miniMap />
            )}
            <TitleBox title="Task Settings">
                <ExitCodeManager
                    title="Exit Codes"
                    exitCodes={form.exit_codes || {}}
                    onChange={(value) => handleFieldChange('exit_codes', value)}
                    isEditMode={isEditMode}
                />
                <NumericInput
                    name="max_attempts"
                    label="Max Attempts"
                    value={form.max_attempts}
                    onChange={(value) => handleFieldChange('max_attempts', value)}
                    disabled={!isEditMode}
                    required
                    isInteger
                    description='The maximum number of node failures this task will perform before it fails.'
                    min={0}
                    fullWidth
                />
                <BooleanInput
                    name="recursive"
                    label="Recursive"
                    value={form.recursive}
                    onChange={(value) => handleFieldChange('recursive', value)}
                    disabled={!isEditMode}
                    description="Normally, if a task being executed is present in the execution history of a task, it will be rejected, unless it is recursive. Workflows and tasks used in Workflows usually should have recursion enabled."
                />
            </TitleBox>

            <DataClusterManager
                dataCluster={form.data_cluster}
                isEditable={true}
                onDataClusterChange={(value) => handleFieldChange('data_cluster', value)}
                flatten={false}
            />
        </GenericFlexibleView>
    );
};

export default TaskFlexibleView;