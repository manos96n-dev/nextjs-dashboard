import { State } from '@/app/lib/actions';

export interface Props {
  id: string;
  state: State;
}

export default function ErrorMessage({ id, state }: Props) {
  return (
    <div id={id} aria-live="polite" aria-atomic="true">
      {state.errors?.status &&
        state.errors.status.map((error: string) => (
          <p className="mt-2 text-sm text-red-500" key={error}>
            {error}
          </p>
        ))}
    </div>
  );
}
