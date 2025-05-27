import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import GlobalBottomSheet from '../components/common/GlobalBottomSheet';

type ModalEntry = {
    id: string;
    sheetRef: React.RefObject<any>;
    content: ReactNode;
};

type GlobalBottomSheetContextType = {
    openSheet: (content: ReactNode) => void;
    closeAllSheets: () => void;
};

const GlobalBottomSheetContext = createContext<GlobalBottomSheetContextType | undefined>(undefined);

export const useGlobalBottomSheet = () => {
    const context = useContext(GlobalBottomSheetContext);
    if (!context) throw new Error('useGlobalBottomSheet must be used within a GlobalBottomSheetProvider');
    return context;
};

export const GlobalBottomSheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [modals, setModals] = useState<ModalEntry[]>([]);

    const openSheet = useCallback((content: ReactNode) => {
        const id = Math.random().toString(36).substring(2, 9);
        const sheetRef = React.createRef<any>();
        setModals((prev) => [...prev, { id, sheetRef, content }]);
    }, []);

    const handleClose = useCallback((id: string) => {
        setModals((prev) => prev.filter((modal) => modal.id !== id));
    }, []);

    const closeAllSheets = () => {
        setModals([]);
    };

    return (
        <GlobalBottomSheetContext.Provider value={{ openSheet, closeAllSheets }}>
            <>
                {children}
                {modals.map((modal, index) => (
                    <GlobalBottomSheet
                        key={modal.id}
                        id={modal.id}
                        sheetRef={modal.sheetRef}
                        onClose={handleClose}
                    >
                        {modal.content}
                    </GlobalBottomSheet>
                ))}
            </>
        </GlobalBottomSheetContext.Provider>
    );
};