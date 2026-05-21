import { useAppContext } from '../store';
import { translations, TranslationKey } from '../i18n';

export const useTranslation = () => {
  const { language } = useAppContext();
  
  const t = (key: TranslationKey) => {
    return translations[language][key] || key;
  };
  
  return { t, language };
};
