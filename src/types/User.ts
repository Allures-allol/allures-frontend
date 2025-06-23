export interface UserOut {
  id: number;
  login: string;
  registered_at: string; // ISO-строка времени
  role: 'user' | 'admin';
  is_blocked: boolean;
}

export interface UserCreate {
  login: string;
  password: string;
}