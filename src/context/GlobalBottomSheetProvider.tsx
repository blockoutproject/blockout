import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import GlobalBottomSheet from '../components/common/GlobalBottomSheet';

export type ModalMode = 'page' | 'popup';

type ModalEntry = {
    id: string;
    sheetRef: React.RefObject<any>;
    content: ReactNode;
    mode: ModalMode;
};

type GlobalBottomSheetContextType = {
    openSheetPage: (content: ReactNode) => string;
    openPopup: (content: ReactNode) => string;
    closeSheetById: (id: string) => void;
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

    const openSheet = useCallback((content: ReactNode, mode: ModalMode): string => {
        const id = Math.random().toString(36).substring(2, 9);
        const sheetRef = React.createRef<any>();
        setModals((prev) => [...prev, { id, sheetRef, content, mode }]);
        return id;
    }, []);

    const openSheetPage = useCallback((content: ReactNode): string => openSheet(content, 'page'), [openSheet]);
    const openPopup = useCallback((content: ReactNode): string => openSheet(content, 'popup'), [openSheet]);

    const handleClose = useCallback((id: string) => {
        setModals((prev) => prev.filter((modal) => modal.id !== id));
    }, []);

    const closeSheetById = useCallback((id: string) => {
        setModals((prev) => prev.filter((modal) => modal.id !== id));
    }, []);

    const closeAllSheets = () => setModals([]);

    return (
        <GlobalBottomSheetContext.Provider value={{ openSheetPage, openPopup, closeSheetById, closeAllSheets }}>
            {children}
            {modals.map((modal) => (
                <GlobalBottomSheet
                    key={modal.id}
                    id={modal.id}
                    sheetRef={modal.sheetRef}
                    onClose={handleClose}
                    mode={modal.mode}
                >
                    {modal.content}
                </GlobalBottomSheet>
            ))}
        </GlobalBottomSheetContext.Provider>
    );
};
