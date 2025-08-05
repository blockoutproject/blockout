import React, {
    createContext,
    useContext,
    useRef,
    useCallback,
    useMemo,
} from 'react';
import Sheet from '@/src/components/common/Sheet';
import type { SheetRef } from '@/src/components/common/Sheet';
import type { SheetStackParamList } from '@/src/components/common/BottomSheetNavigator';

type SheetContextType = {
    open: <T extends keyof SheetStackParamList>(screen: T, params: SheetStackParamList[T]) => void;
    close: () => void;
};

const SheetContext = createContext<SheetContextType | null>(null);

export const useSheet = () => {
    const ctx = useContext(SheetContext);
    if (!ctx) throw new Error('useSheet must be used inside a SheetProvider');
    return ctx;
};

export const SheetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const ref = useRef<SheetRef>(null);

    const open = useCallback(<T extends keyof SheetStackParamList>(
        screen: T,
        params: SheetStackParamList[T]
    ) => {
        ref.current?.open(screen, params);
    }, []);

    const close = useCallback(() => {
        ref.current?.close();
    }, []);

    const value = useMemo(() => ({ open, close }), [open, close]);

    return (
        <SheetContext.Provider value={value}>
            {children}
            <Sheet ref={ref} />
        </SheetContext.Provider>
    );
};