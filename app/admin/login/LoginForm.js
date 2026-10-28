'use client';

import { useActionState } from 'react';
import { login } from '../actions';

export default function LoginForm({ next }) {
  const [state, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next} />
      <label>
        Clave
        <input type="password" name="password" required autoFocus autoComplete="current-password" />
      </label>
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  );
}
