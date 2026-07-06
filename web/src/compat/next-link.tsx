import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { Link as RouterLink, type To } from "react-router-dom";

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: To;
  children: ReactNode;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
};

const Link = forwardRef<HTMLAnchorElement, NextLinkProps>(function Link(
  { href, replace, children, prefetch, scroll, ...rest },
  ref
) {
  return (
    <RouterLink ref={ref} replace={replace} to={href} {...rest}>
      {children}
    </RouterLink>
  );
});

export default Link;
