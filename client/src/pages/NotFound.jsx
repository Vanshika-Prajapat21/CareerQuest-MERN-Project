import EmptyState from "../components/EmptyState";

export default function NotFound() {
  return <EmptyState icon="🧭" title="Page not found" text="The page you are looking for does not exist." linkTo="/" linkText="Go home" />;
}
