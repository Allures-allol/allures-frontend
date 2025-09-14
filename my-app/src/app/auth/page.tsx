'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from "next/navigation";
import styles from './auth.module.css';
import type { UserOut} from '../../types/User';
import Image from 'next/image';

type AuthTab = 'register' | 'login';
const TAB_REGISTER: AuthTab = 'register';
const TAB_LOGIN: AuthTab = 'login';

const AUTH_BASE = 'https://api.alluresallol.com/auth';
// === Auth token storage (10 minutes TTL) ===
const TOKEN_KEY = 'allures_jwt';
const TOKEN_EXPIRES_AT_KEY = 'allures_jwt_expires_at';
const TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function smartAuthFetch(path: string, body: any): Promise<Response> {
  // Прямий запит на бекенд авторизації
  const url = `${AUTH_BASE}${path}`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
}

interface FastAPIError {
loc?: (string | number)[];
msg: string;
type?: string;
}

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>(TAB_LOGIN);
  const [loading, setLoading] = useState(true);
  const [forgot, setForgot] = useState(false);
  const [error, setError] = useState<string | null>(null); // Новое состояние
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<UserOut | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const expiryTimerRef = useRef<number | null>(null);

  const scheduleExpiry = (ms: number) => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
    }
    expiryTimerRef.current = window.setTimeout(() => {
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
      } catch {}
    }, Math.max(0, ms));
  };

  const setAuthToken = (token: string) => {
    try {
      const expiresAt = Date.now() + TOKEN_TTL_MS;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXPIRES_AT_KEY, String(expiresAt));
      scheduleExpiry(expiresAt - Date.now());
    } catch {}
  };

  const isRegister = activeTab === TAB_REGISTER;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const expRaw = localStorage.getItem(TOKEN_EXPIRES_AT_KEY);
      const exp = expRaw ? Number(expRaw) : NaN;

      if (token && !Number.isNaN(exp)) {
        const remain = exp - Date.now();
        if (remain > 0) {
          scheduleExpiry(remain);
        } else {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(TOKEN_EXPIRES_AT_KEY);
        }
      }
    } catch {}

    return () => {
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingRoot}>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg);}
            100% { transform: rotate(360deg);}
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px);}
            to { opacity: 1; transform: translateY(0);}
          }
        `}</style>
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>
            Загружаем пиксели... Пожалуйста, не выключайте интернет! 🚀🧠
          </span>
        </div>
      </div>
    );
  }

  // Искусственное отображение ошибки
  if (error) {
    return (
      <div className={styles.root}>
        <div className={styles.card} style={{ alignItems: "center", color: "#d32f2f", paddingTop: 40, paddingBottom: 40 }}>
          <div style={{ fontSize: 72, marginBottom: 12, animation: "shake 0.7s" }}>🚨</div>
          <h2 style={{ marginBottom: 8, fontWeight: 800, fontSize: 28, letterSpacing: 1 }}>
            Ой, щось пішло не так!
          </h2>
          <div style={{ marginBottom: 18, fontSize: 17, color: "#b71c1c", textAlign: "center" }}>
            {error}
          </div>
          <div style={{
            background: "#fff3e0",
            color: "#ff9800",
            borderRadius: 8,
            padding: "10px 18px",
            marginBottom: 18,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 8px #ff980033"
          }}>
            <span style={{ fontSize: 22 }}>💡</span>
            Спробуйте перевірити підключення до інтернету або оновити сторінку.
          </div>
          <button
            className={styles.submitBtn}
            style={{ background: "#2196f3", minWidth: 180 }}
            onClick={() => setError(null)}
          >
            Спробувати ще раз
          </button>
          <style>{`
            @keyframes shake {
              0% { transform: translateX(0);}
              20% { transform: translateX(-8px);}
              40% { transform: translateX(8px);}
              60% { transform: translateX(-6px);}
              80% { transform: translateX(6px);}
              100% { transform: translateX(0);}
            }
          `}</style>
        </div>
      </div>
    );
  }
// Если пользователь уже авторизован, показываем приветствие
  // if (user) { 
  //   
  //   return (
  //     <div className={styles.root}>
  //       <div className={styles.card} style={{ alignItems: "center", paddingTop: 40, paddingBottom: 40 }}>
  //         <div style={{ fontSize: 48, marginBottom: 12 }}>👋</div>
  //         <h2 style={{ marginBottom: 8, fontWeight: 800, fontSize: 24 }}>
  //           Вітаємо, {user.login}!
  //         </h2>
  //         <div style={{ marginBottom: 18, fontSize: 16 }}>
  //           Ви увійшли як <b>{user.role}</b>. <br />
  //           Зареєстровано: {new Date(user.registered_at).toLocaleString()}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  async function handleAuth(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (!login.trim() || !password.trim()) {
      setError("Будь ласка, заповніть всі поля.");
      return;
    }

    // Бэк ожидает email+password. Поле "login" используем как email.
    const path = isRegister ? '/register' : '/login';
    const payload = { login, password };

    let res: Response;
    try {
      res = await smartAuthFetch(path, payload);
    } catch (e) {
      // Сетевая ошибка (CORS/офлайн)
      setError('Не вдалось зʼєднатися із сервером. Перевірте інтернет або дозвіл CORS.');
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Показываем подробную ошибку от сервера
      const errorMessage = Array.isArray(data?.detail)
        ? (data.detail as FastAPIError[]).map(err => err.msg).join('; ')
        : typeof data?.detail === 'string'
          ? data.detail
          : data?.msg || 'Сталася помилка. Спробуйте ще раз.';

      setError(errorMessage || 'Помилка авторизації');
      return;
    }

    if (activeTab === TAB_LOGIN) {
      if (data.access_token) {
        setAuthToken(data.access_token);
      }
      setUser({
        id: data.id || 0,
        login: data.login,
        role: data.role,
        registered_at: data.registered_at,
        is_blocked: data.is_blocked ?? false
      });
    } else {
      // /auth/register відповідає як у Swagger:
      // { message: string, login: string, email_enabled: boolean }
      const msg: string = data?.message || 'Користувача створено.';
      const emailEnabled: boolean = Boolean(data?.email_enabled);

      // Мʼяко запитуємо відправку коду підтвердження (не блокує флоу)
      try { await smartAuthFetch('/verify/request', { email: login }); } catch {}

      // Показуємо інформбанер і переводимо на вкладку "Увійти"
      setInfo(`${msg} ${emailEnabled ? '' : 'Перевірте пошту — очікується підтвердження email.'}`.trim());

      // На реєстрації дані користувача не приходять у повному вигляді — не заповнюємо setUser
      setPassword('');
      setActiveTab(TAB_LOGIN);
      return;
    }

    setLogin('');
    setPassword('');
    if (activeTab === TAB_REGISTER) {
      setActiveTab(TAB_LOGIN);
      return;
    }
    router.push('/');
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        {info && (
          <div style={{
            background: '#e8f5e9',
            color: '#1b5e20',
            border: '1px solid #c8e6c9',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 14
          }}>
            {info}
          </div>
        )}
        {/* Кнопка для теста ошибки
        <button
          className={styles.submitBtn}
          style={{ marginBottom: 16, background: "#d32f2f" }}
          onClick={() => setError("Тестова помилка! Щось пішло не так.")}
        >
          Вызвать ошибку (тест)
        </button> */}
        {!forgot ? (
          <>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === TAB_REGISTER ? styles.active : ''}`}
                onClick={() => setActiveTab(TAB_REGISTER)}
                type="button"
              >
                Зареєструватися
              </button>
              <button
                className={`${styles.tab} ${activeTab === TAB_LOGIN ? styles.active : ''}`}
                onClick={() => setActiveTab(TAB_LOGIN)}
                type="button"
              >
                Увійти
              </button>
            </div>
          <form className={styles.form} onSubmit={handleAuth}>
            <h2 className={styles.title}>
              {isRegister ? 'Зареєструватися' : 'Увійти'}
            </h2>
            <input
              className={styles.input}
              type="email"
              placeholder="Email"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
            />
            <div className={styles.inputRow}>
              <input
                className={styles.input}
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <a
                href="#"
                className={styles.forgot}
                onClick={e => {
                  e.preventDefault();
                  setForgot(true);
                }}
              >
                Забули пароль?
              </a>
            </div>
            {/* <button type="button" className={styles.googleBtn}>
              Продовжити з Google
              <Image
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                width={22}
                height={22}
                className={styles.googleIcon}
              />
            </button> */}
            <div className={styles.info}>
              <p>{`Увійшовши в систему, ви погоджуєтеся з 'Умовами…'`}</p>
              <a
                href="https://www.privacypolicies.com/live/97b147a3-48dc-4d1e-8ee3-ba19d17f27f2"
                target="_blank"
                rel="noopener noreferrer"
              >
                Умовами надання послуги та Політикою конфіденційності
              </a>
            </div>
            <button type="submit" className={styles.submitBtn}>
              {isRegister ? 'Зареєструватися' : 'Увійти'}
            </button>
          </form>
          <div className={styles.bottomText}>
            {activeTab === TAB_REGISTER ? (
              <>
                Вже маєте обліковий запис?
                <a
                  href="#"
                  className={styles.registerLink}
                  onClick={e => {
                    e.preventDefault();
                    setActiveTab(TAB_LOGIN);
                  }}
                >
                  Увійти
                </a>
              </>
            ) : (
              <>
                Потрібен обліковий запис?
                <a
                  href="#"
                  className={styles.registerLink}
                  onClick={e => {
                    e.preventDefault();
                    setActiveTab(TAB_REGISTER);
                  }}
                >
                  Зареєструватися
                </a>
              </>
            )}
          </div>
        </>
      ) : (
        <form className={styles.form} style={{ minWidth: 280 }}>
          <h2 className={styles.title} style={{ textAlign: 'center' }}>
            Скинути пароль
          </h2>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <p>{`Будь ласка, введіть адресу електронної пошти, пов'язану з вашим обліковим записом.`}</p>
          </div>
          <input
            className={styles.input}
            type="email"
            placeholder="Адреса електронної пошти"
          />
          <button type="submit" className={styles.submitBtn}>
            Скинути пароль
          </button>
          <div className={styles.bottomText}>
            <a
              href="#"
              className={styles.registerLink}
              onClick={e => {
                e.preventDefault();
                setForgot(false);
              }}
            >
              Повернутися до входу
            </a>
          </div>
        </form>
      )}
    </div>
  </div>
);
}
