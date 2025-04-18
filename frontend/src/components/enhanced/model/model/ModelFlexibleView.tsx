import React, { useCallback, useEffect, useState } from 'react';
import { Slider, Typography } from '@mui/material';
import { AliceModel, getDefaultModelForm, ModelComponentProps, ModelType, ModelConfig, ChatTemplateTokens, ModelCosts } from '../../../../types/ModelTypes';
import { ApiName } from '../../../../types/ApiTypes';
import { formatCamelCaseString } from '../../../../utils/StyleUtils';
import { apiNameIcons, modelTypeIcons } from '../../../../utils/ApiUtils';
import GenericFlexibleView from '../../../common/enhanced_component/FlexibleView';
import BorderedBox from '../../../common/inputs/TitleBox';
import { TextInput } from '../../../common/inputs/TextInput';
import { NumericInput } from '../../../common/inputs/NumericInput';
import { BooleanInput } from '../../../common/inputs/BooleanInput';
import { IconSelectInput } from '../../../common/inputs/IconSelectInput';

const ModelFlexibleView: React.FC<ModelComponentProps> = ({
    item,
    onChange,
    mode,
    handleSave,
    handleDelete
}) => {
    const [form, setForm] = useState<Partial<AliceModel>>(() => item || getDefaultModelForm());
    const [isSaving, setIsSaving] = useState(false);

    const isEditMode = mode === 'edit' || mode === 'create';
    const title = mode === 'create' ? 'Create New Model' : mode === 'edit' ? 'Edit Model' : 'Model Details';
    const saveButtonText = form?._id ? 'Update Model' : 'Create Model';

    useEffect(() => {
        if (isSaving) {
            handleSave();
            setIsSaving(false);
        }
    }, [isSaving, handleSave]);

    useEffect(() => {
        if (!item || Object.keys(item).length === 0) {
            onChange(getDefaultModelForm());
        } else {
            setForm(item);
        }
    }, [item, onChange]);

    const handleConfigChange = useCallback((field: keyof ModelConfig, value: ModelConfig[keyof ModelConfig]) => {
        setForm(prevForm => {
            if (!prevForm.config_obj) {
                prevForm.config_obj = getDefaultModelForm().config_obj;
            }

            return {
                ...prevForm,
                config_obj: {
                    ...prevForm.config_obj,
                    [field]: value
                }
            } as Partial<AliceModel>;
        });
    }, []);

    const handleCostsChange = useCallback((field: keyof ModelCosts, value: number) => {
        setForm(prevForm => {
            const defaultCosts = getDefaultModelForm().model_costs;
            return {
                ...prevForm,
                model_costs: {
                    ...(prevForm.model_costs ?? defaultCosts),
                    [field]: value
                }
            } as Partial<AliceModel>;
        });
    }, []);

    const handlePromptConfigChange = useCallback((field: keyof ChatTemplateTokens, value: string) => {
        setForm(prevForm => {
            const defaultForm = getDefaultModelForm();

            return {
                ...prevForm,
                config_obj: {
                    ...(prevForm.config_obj ?? defaultForm.config_obj),
                    prompt_config: {
                        ...(prevForm.config_obj?.prompt_config ?? defaultForm.config_obj?.prompt_config ?? {}),
                        [field]: value
                    }
                }
            } as Partial<AliceModel>;
        });
    }, []);

    const handleBaseFieldChange = useCallback((field: keyof AliceModel, value: any) => {
        setForm(prevForm => ({ ...prevForm, [field]: value }));
    }, []);

    const handleLocalSave = useCallback(() => {
        onChange(form);
        setIsSaving(true);
    }, [form, onChange]);

    const handleLocalDelete = useCallback(() => {
        if (item && Object.keys(item).length > 0 && handleDelete) {
            handleDelete(item);
        }
    }, [item, handleDelete]);

    return (
        <GenericFlexibleView
            elementType='Model'
            title={title}
            onSave={handleLocalSave}
            onDelete={handleLocalDelete}
            saveButtonText={saveButtonText}
            isEditMode={isEditMode}
            mode={mode}
            item={form as AliceModel}
            itemType='models'
        >
            <TextInput
                name='short_name'
                label="Short Name"
                value={form.short_name ?? ''}
                onChange={(value) => handleBaseFieldChange('short_name', value)}
                description='The short name of the model. A unique identifier for this model.'
                disabled={!isEditMode}
            />
            <TextInput
                name='model_name'
                label="Model Name"
                value={form.model_name ?? ''}
                onChange={(value) => handleBaseFieldChange('model_name', value)}
                description='The name of the model. This should be the name the API uses to reference the model.'
                disabled={!isEditMode}
            />
            <IconSelectInput
                name='model_type'
                label="Model Type"
                value={form.model_type ?? ''}
                description='The type of model to create. Use Chat for LLM models.'
                onChange={(value) => handleBaseFieldChange('model_type', value as ModelType)}
                options={Object.values(ModelType).map((type) => ({ value: type, label: formatCamelCaseString(type), icon: modelTypeIcons[type] }))}
                disabled={!isEditMode}
            />
            <IconSelectInput
                name='api_name'
                label="API Name"
                value={form.api_name ?? ''}
                onChange={(value) => handleBaseFieldChange('api_name', value as ApiName)}
                options={Object.values(ApiName).map((name) => ({ value: name, label: formatCamelCaseString(name), icon: apiNameIcons[name] }))}
                disabled={!isEditMode}
            />

            <BorderedBox title="Model Configuration">
                <NumericInput
                    name='ctx_size'
                    label="Context Size"
                    value={form.config_obj?.ctx_size ?? 4096}
                    description='The context size of the model. Really important to avoid errors, or loss of context that might be handled quietly by the API.'
                    onChange={(value) => handleConfigChange('ctx_size', value ?? 4096)}
                    disabled={!isEditMode}
                />

                <Typography variant="subtitle1">Temperature</Typography>
                <Slider
                    value={form.config_obj?.temperature ?? 0.7}
                    onChange={(_, newValue) => handleConfigChange('temperature', newValue as number)}
                    min={0}
                    max={1}
                    step={0.1}
                    valueLabelDisplay="auto"
                    disabled={!isEditMode}
                    sx={{ margin: 1 }}
                />

                <NumericInput
                    name='seed'
                    label="Seed"
                    value={form.config_obj?.seed ?? undefined}
                    onChange={(value) => handleConfigChange('seed', value ?? null)}
                    disabled={!isEditMode}
                />

                <BooleanInput
                    name='use_cache'
                    label="Use Cache"
                    value={form.config_obj?.use_cache ?? true}
                    onChange={(value) => handleConfigChange('use_cache', value ?? false)}
                    disabled={!isEditMode}
                />
                <NumericInput
                    name='max_tokens_gen'
                    label="Max tokens"
                    value={form.config_obj?.max_tokens_gen ?? 4096}
                    description='The maximum number of tokens to generate in a single request.'
                    onChange={(value) => handleConfigChange('max_tokens_gen', value ?? 4096)}
                    disabled={!isEditMode}
                />
                <BorderedBox title="Prompt Configuration">
                    <TextInput
                        name='bos'
                        label="Begin of Sequence Token"
                        value={form.config_obj?.prompt_config?.bos ?? '<|im_start|>'}
                        onChange={(value) => handlePromptConfigChange('bos', value ?? '<|im_start|>')}
                        disabled={!isEditMode}
                    />
                    <TextInput
                        name='eos'
                        label="End of Sequence Token"
                        value={form.config_obj?.prompt_config?.eos ?? '<|im_end|>'}
                        onChange={(value) => handlePromptConfigChange('eos', value ?? '<|im_end|>')}
                        disabled={!isEditMode}
                    />
                    <TextInput
                        name='system_role'
                        label="System Role Token"
                        value={form.config_obj?.prompt_config?.system_role ?? 'system'}
                        onChange={(value) => handlePromptConfigChange('system_role', value ?? 'system')}
                        disabled={!isEditMode}
                    />
                    <TextInput
                        name='user_role'
                        label="User Role Token"
                        value={form.config_obj?.prompt_config?.user_role ?? 'user'}
                        onChange={(value) => handlePromptConfigChange('user_role', value ?? 'user')}
                        disabled={!isEditMode}
                    />
                    <TextInput
                        name='assistant_role'
                        label="Assistant Role Token"
                        value={form.config_obj?.prompt_config?.assistant_role ?? 'assistant'}
                        onChange={(value) => handlePromptConfigChange('assistant_role', value ?? 'assistant')}
                        disabled={!isEditMode}
                    />
                    <TextInput
                        name='tool_role'
                        label="Tool Role Token"
                        value={form.config_obj?.prompt_config?.tool_role ?? 'tool'}
                        onChange={(value) => handlePromptConfigChange('tool_role', value ?? 'tool')}
                        disabled={!isEditMode}
                    />
                </BorderedBox>
            </BorderedBox>

            <BorderedBox title="Model Costs">
                <NumericInput
                    name='input_token_cost'
                    label="Input Token Cost (per million)"
                    value={form.model_costs?.input_token_cost_per_million ?? 0.15}
                    description='Cost per million tokens for input/prompt tokens'
                    onChange={(value) => handleCostsChange('input_token_cost_per_million', value ?? 0.15)}
                    disabled={!isEditMode}
                />
                <NumericInput
                    name='cached_input_token_cost'
                    label="Cached Input Token Cost (per million)"
                    value={form.model_costs?.cached_input_token_cost_per_million ?? 0.075}
                    description='Cost per million tokens for cached input tokens'
                    onChange={(value) => handleCostsChange('cached_input_token_cost_per_million', value ?? 0.075)}
                    disabled={!isEditMode}
                />
                <NumericInput
                    name='output_token_cost'
                    label="Output Token Cost (per million)"
                    value={form.model_costs?.output_token_cost_per_million ?? 0.6}
                    description='Cost per million tokens for generated output tokens'
                    onChange={(value) => handleCostsChange('output_token_cost_per_million', value ?? 0.6)}
                    disabled={!isEditMode}
                />
            </BorderedBox>

        </GenericFlexibleView>
    );
};

export default ModelFlexibleView;