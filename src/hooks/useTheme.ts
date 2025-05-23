import { useTheme as useNavigationTheme } from '@react-navigation/native';
import { AppTheme } from '../constants/Theme';

export const useTheme = () => {
    return useNavigationTheme() as AppTheme;
};