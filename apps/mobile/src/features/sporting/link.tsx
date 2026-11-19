import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { useSportingNavigation, type SportingResourceKind } from "./navigation";

interface SportingLinkProps {
  kind: SportingResourceKind;
  id: string;
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** A native resource link keeps every exact destination behind the shared sporting transition. */
export function SportingLink(props: Readonly<SportingLinkProps>) {
  // A recycled row can display another resource while the original opening is pending.
  return <ResourceLink key={`${props.kind}:${props.id}`} {...props} />;
}

function ResourceLink({
  kind,
  id,
  label,
  active,
  style,
  children,
}: Readonly<SportingLinkProps>) {
  const sporting = useSportingNavigation(active);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void sporting.navigate(kind, id)}
      style={({ pressed }) => [
        style,
        pressed && { opacity: tokens.opacity.pressed },
      ]}
    >
      {children}
    </Pressable>
  );
}
