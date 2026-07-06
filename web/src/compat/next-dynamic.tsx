import { Suspense, lazy, type ComponentType, type ReactElement } from "react";

type DynamicOptions = {
  loading?: () => ReactElement | null;
  ssr?: boolean;
};

type LoaderResult<TProps> =
  | { default: ComponentType<TProps> }
  | ComponentType<TProps>;

export default function dynamic<TProps extends object>(
  loader: () => Promise<LoaderResult<TProps>>,
  options?: DynamicOptions
) {
  const LazyComponent = lazy(async () => {
    const loaded = await loader();

    if (typeof loaded === "function") {
      return { default: loaded };
    }

    return loaded;
  });

  return function DynamicComponent(props: TProps) {
    const fallback = options?.loading ? options.loading() : null;
    return (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
