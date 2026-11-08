import { Stack, usePathname, useRouter } from "expo-router";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Button } from "./button";
import { FieldMessage } from "./field-message";
import { Sheet, SheetContent } from "./sheet";

/** One mounted image field supplies current choices; no image or callback enters the route URL. */
export interface ImageChoiceRequest {
  owner: object;
  title: string;
  chooseLabel: string;
  removeLabel: string;
  helper?: string;
  disabled: boolean;
  pending: boolean;
  onChoose: () => void;
  onRemove?: () => void;
}

/** Exchanges only the currently presented field with its native sheet route. */
interface ImageChoices {
  open: (request: ImageChoiceRequest) => void;
  update: (request: ImageChoiceRequest) => void;
  dismiss: (owner: object) => void;
  release: (owner: object) => void;
  clear: (owner: object) => void;
}

const ImageChoicesContext = createContext<ImageChoices | undefined>(undefined);
const ImageChoiceRequestContext = createContext<ImageChoiceRequest | null>(
  null,
);

/** Keeps one ephemeral choice request above protected native routes, retired with its field or session. */
export function ImageChoicesProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const navigation = useRef(router);
  const pathname = usePathname();
  const path = useRef(pathname);
  useLayoutEffect(() => {
    navigation.current = router;
    path.current = pathname;
  }, [router, pathname]);
  const mounted = useRef(true);
  const current = useRef<ImageChoiceRequest | null>(null);
  const [request, setRequest] = useState<ImageChoiceRequest | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const choices = useMemo<ImageChoices>(() => {
    /** A route dismissal never navigates another current destination or a retired session. */
    function dismiss(owner: object) {
      if (!mounted.current || current.current?.owner !== owner) {
        return;
      }
      clear(owner);
      if (path.current === "/image-choices") {
        if (navigation.current.canGoBack()) {
          navigation.current.back();
        } else {
          navigation.current.replace("/");
        }
      }
    }

    /** Removes only this field's request; another field cannot be cleared by a late cleanup. */
    function clear(owner: object) {
      if (!mounted.current || current.current?.owner !== owner) {
        return;
      }
      current.current = null;
      setRequest(null);
    }

    return {
      open: (next) => {
        if (!mounted.current || current.current) {
          return;
        }
        current.current = next;
        setRequest(next);
        navigation.current.push("/image-choices");
      },
      update: (next) => {
        if (!mounted.current || current.current?.owner !== next.owner) {
          return;
        }
        current.current = next;
        setRequest(next);
      },
      dismiss,
      clear,
      release: dismiss,
    };
  }, []);

  return (
    <ImageChoicesContext value={choices}>
      <ImageChoiceRequestContext value={request}>
        {children}
      </ImageChoiceRequestContext>
    </ImageChoicesContext>
  );
}

/** Gives mounted controls the native presenter without observing another field's request state. */
export function useImageChoices() {
  const choices = useContext(ImageChoicesContext);
  if (!choices) {
    throw new Error("Image choices require the protected stack provider");
  }
  return choices;
}

/** Composes current choices within the existing sheet; owners retain selection, authorization and local draft intent. */
export function ImageChoicesSheet() {
  const request = useContext(ImageChoiceRequestContext);
  const choices = useImageChoices();
  const owner = request?.owner;
  useEffect(
    () => () => {
      if (owner) {
        choices.clear(owner);
      }
    },
    [choices, owner],
  );

  if (!request) {
    return null;
  }

  return (
    <Sheet
      title={request.title}
      onClose={() => choices.dismiss(request.owner)}
      closeDisabled={request.pending}
    >
      <SheetContent>
        <Button
          label={request.chooseLabel}
          variant="secondary"
          fullWidth
          disabled={request.disabled}
          onPress={request.onChoose}
        />
        {request.onRemove && (
          <Button
            label={request.removeLabel}
            variant="secondary"
            fullWidth
            disabled={request.disabled}
            onPress={request.onRemove}
          />
        )}
        <FieldMessage helper={request.helper} />
      </SheetContent>
    </Sheet>
  );
}

/** Registers dynamic native dismissal while direct entries have no image authority or operation. */
export function ImageChoicesScreen() {
  const request = useContext(ImageChoiceRequestContext);
  const router = useRouter();

  /** A direct route offers ordinary departure without creating a field or a file operation. */
  function close() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !request?.pending }} />
      {request ? (
        <ImageChoicesSheet />
      ) : (
        <Sheet title="Image" onClose={close} />
      )}
    </>
  );
}
