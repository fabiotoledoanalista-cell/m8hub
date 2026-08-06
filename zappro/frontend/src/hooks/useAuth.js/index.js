import { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { socketConnection } from "../../services/socket";
// import { useDate } from "../../hooks/useDate";
import moment from "moment";

const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  const noopSocket = useRef({
    connected: false,
    on: () => { },
    off: () => { },
    emit: () => { },
    connect: () => { },
    disconnect: () => { },
  });

  const clearAuthState = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cshow");
    api.defaults.headers.Authorization = undefined;
    setIsAuth(false);
    setUser({});
  };

  const finalizeLogout = async () => {
    await unregisterPushSubscription();
    setIsAuth(false);
    setUser({});
    socketRef.current = null;
    setSocket(null);
    localStorage.removeItem("token");
    localStorage.removeItem("cshow");
    api.defaults.headers.Authorization = undefined;
    setLoading(false);
    history.push("/login");
  };

  const getCurrentPushEndpoint = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      return subscription?.endpoint || null;
    } catch (_) {
      return null;
    }
  };

  const unregisterPushSubscription = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe().catch(() => {});
      }
    } catch (_) {}
  };

  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("token");
        if (token) {
          config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
          setIsAuth(true);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error?.response?.status === 403 && !originalRequest?._retry) {
          try {
            originalRequest._retry = true;

            const { data } = await api.post("/auth/refresh_token");
            if (data?.token) {
              localStorage.setItem("token", JSON.stringify(data.token));
              api.defaults.headers.Authorization = `Bearer ${data.token}`;
            }
            if (data?.user) {
              setUser(data.user);
            }
            return api(originalRequest);
          } catch (_) {
            clearAuthState();
            return Promise.reject(error);
          }
        }

        if (error?.response?.status === 401) {
          clearAuthState();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          if (data?.token) {
            localStorage.setItem("token", JSON.stringify(data.token));
            api.defaults.headers.Authorization = `Bearer ${data.token}`;
          }
          setIsAuth(true);
          setUser(data?.user || {});
        } catch (err) {
          clearAuthState();
        }
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (Object.keys(user).length && user.id > 0) {
      let io = socketRef.current;

      if (!io) {
        io = socketConnection({ user });
        socketRef.current = io;
        setSocket(io);
      }

      if (!io || typeof io.on !== "function") {
        return;
      }

      io.on(`company-${user.companyId}-user`, (data) => {
        if (data.action === "update" && data.user.id === user.id) {
          setUser(data.user);
        }
      });

      return () => {
        io.off(`company-${user.companyId}-user`);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [user]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      const {
        user: { company },
      } = data;

      if (has(company, "companieSettings") && isArray(company.companieSettings[0])) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "campaignsEnabled"
        );
        if (setting && setting.value === "true") {
          localStorage.setItem("cshow", null); //regra pra exibir campanhas
        }
      }

      if (has(company, "companieSettings") && isArray(company.companieSettings[0])) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "sendSignMessage"
        );

        const signEnable = setting.value === "enable";

        if (setting && setting.value === "enabled") {
          localStorage.setItem("sendSignMessage", signEnable); //regra pra exibir campanhas
        }
      }
      localStorage.setItem("profileImage", data.user.profileImage); //regra pra exibir imagem contato

      moment.locale('pt-br');
      let dueDate;
      if (data.user.company.id === 1) {
        dueDate = '2999-12-31T00:00:00.000Z'
      } else {
        dueDate = data.user.company.dueDate;
      }
      const hoje = moment(moment()).format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(dueDate).diff(moment(moment()).format());

      var before = moment(moment().format()).isBefore(dueDate);
      var dias = moment.duration(diff).asDays();

      if (before === true) {
        localStorage.setItem("token", JSON.stringify(data.token));
        // localStorage.setItem("public-token", JSON.stringify(data.user.token));
        // localStorage.setItem("companyId", companyId);
        // localStorage.setItem("userId", id);
        localStorage.setItem("companyDueDate", vencimento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));
        if (Math.round(dias) < 5) {
          toast.warn(`Sua assinatura vence em ${Math.round(dias)} ${Math.round(dias) === 1 ? 'dia' : 'dias'} `);
        }

        // // Atraso para garantir que o cache foi limpo
        // setTimeout(() => {
        //   window.location.reload(true); // Recarregar a página
        // }, 1000);

        history.push("/tickets");
        setLoading(false);
      } else {
        // localStorage.setItem("companyId", companyId);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setIsAuth(true);
        toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
        history.push("/financeiro-aberto");
        setLoading(false);
      }

    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      const endpoint = await getCurrentPushEndpoint();

      if (socketRef.current && typeof socketRef.current.disconnect === "function") {
        socketRef.current.disconnect();
      }
      await api.delete("/auth/logout", {
        data: endpoint ? { endpoint } : {}
      });
      await finalizeLogout();
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 401 && status !== 403) {
        toastError(err);
      }
      await finalizeLogout();
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      console.log(data)
      return data;
    } catch (_) {
      return null;
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
    socket: socket || noopSocket.current
  };
};

export default useAuth;
