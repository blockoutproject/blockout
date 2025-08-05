import React, { useImperativeHandle, useRef, useState } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import BottomSheetCustomPage from './BottomSheetCustomPage';
import BottomSheetNavigator, { SheetStackParamList, resetSheetTo } from './BottomSheetNavigator';

export type SheetRef = {
    open: <T extends keyof SheetStackParamList>(
        screen: T,
        params: SheetStackParamList[T]
    ) => void;
    close: () => void;
};

const Sheet = React.forwardRef<SheetRef>((_, ref) => {
    const modalRef = useRef<BottomSheetModal>(null);

    const [initialScreen, setInitialScreen] = useState<keyof SheetStackParamList>('Match');
    const [params, setParams] = useState<any>({});

    const close = () => modalRef.current?.dismiss();

    useImperativeHandle(ref, () => ({
        open: (screen, parameters) => {
            setInitialScreen(screen);
            setParams(parameters);
            resetSheetTo(screen, parameters as any);
            modalRef.current?.present();
        },
        close,
    }));

    return (
        <BottomSheetCustomPage ref={modalRef}>
            <BottomSheetNavigator
                initialScreen={initialScreen}
                params={params}
                onCloseSheet={close}
            />
        </BottomSheetCustomPage>
    );
});

export default Sheet;