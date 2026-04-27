import { UnifiedFormBuilder } from '@/components/ServiceForms/FormBuilder/UnifiedFormBuilder';
import BasicInfoPage from './BasicInfoPage';
import { useParams } from 'react-router-dom';

const FormBuilderPage = () => {
  const { id } = useParams<{ id: string }>();
  const { step } = useParams<{ step: string }>();

  // Show BasicInfoPage for create flow (no id, no step)
  // Show UnifiedFormBuilder for create/builder or edit flow
  const showBasicInfo = !id && step !== 'builder';

  if (showBasicInfo) {
    return <BasicInfoPage />;
  }

  return <UnifiedFormBuilder />;
};

export default FormBuilderPage;
