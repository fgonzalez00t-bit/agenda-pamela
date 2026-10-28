import LoginForm from './LoginForm';

export const metadata = { title: 'Ingresar · Panel' };

export default async function LoginPage({ searchParams }) {
  const { next } = await searchParams;
  return (
    <main className="page narrow">
      <section className="card">
        <h1 className="admin-title">Panel de Pamela</h1>
        <LoginForm next={next || '/admin'} />
      </section>
    </main>
  );
}
