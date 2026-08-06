import React, { useState, useEffect, useMemo } from "react";
import api from "./services/api";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "react-query";
import { ptBR } from "@material-ui/core/locale";
import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { useMediaQuery } from "@material-ui/core";
import ColorModeContext from "./layout/themeContext";
import { ActiveMenuProvider } from "./context/ActiveMenuContext";
import Favicon from "react-favicon";
import { getBackendUrl } from "./config";
import Routes from "./routes";
import defaultLogoLight from "./assets/logo.png";
import defaultLogoDark from "./assets/logo-black.png";
import defaultLogoFavicon from "./assets/favicon.ico";
import defaultAppleTouchIcon from "./assets/apple-touch-icon.png";
import defaultPwaAndroid192 from "./assets/android-chrome-192x192.png";
import defaultPwaAndroid512 from "./assets/android-chrome-512x512.png";
import defaultMsTile150 from "./assets/mstile-150x150.png";
import useSettings from "./hooks/useSettings";

const queryClient = new QueryClient();

const App = () => {
  const [locale, setLocale] = useState();
  const appColorLocalStorage = localStorage.getItem("primaryColorLight") || localStorage.getItem("primaryColorDark") || "#065183";
  const appNameLocalStorage = localStorage.getItem("appName") || "";
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const preferredTheme = window.localStorage.getItem("preferredTheme");
  const [mode, setMode] = useState(preferredTheme ? preferredTheme : prefersDarkMode ? "dark" : "light");
  const [primaryColorLight, setPrimaryColorLight] = useState(appColorLocalStorage);
  const [primaryColorDark, setPrimaryColorDark] = useState(appColorLocalStorage);
  const [appLogoLight, setAppLogoLight] = useState(defaultLogoLight);
  const [appLogoDark, setAppLogoDark] = useState(defaultLogoDark);
  const [appLogoFavicon, setAppLogoFavicon] = useState(defaultLogoFavicon);
  const [appLogoAppleTouchIcon, setAppLogoAppleTouchIcon] = useState(defaultAppleTouchIcon);
  const [appLogoPwaAndroid192, setAppLogoPwaAndroid192] = useState(defaultPwaAndroid192);
  const [appLogoPwaAndroid512, setAppLogoPwaAndroid512] = useState(defaultPwaAndroid512);
  const [appLogoPwaMsTile150, setAppLogoPwaMsTile150] = useState(defaultMsTile150);
  const [appName, setAppName] = useState(appNameLocalStorage);
  const { getPublicSetting } = useSettings();

  const resolvePublicLogoUrl = (file, fallback) => {
    if (!file) return fallback;
    if (String(file).startsWith("http")) return file;
    return `${getBackendUrl()}/public/${file}`;
  };
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          window.localStorage.setItem("preferredTheme", newMode); // Persistindo o tema no localStorage
          return newMode;
        });
      },
      setPrimaryColorLight,
      setPrimaryColorDark,
      setAppLogoLight,
      setAppLogoDark,
      setAppLogoFavicon,
      setAppLogoAppleTouchIcon,
      setAppLogoPwaAndroid192,
      setAppLogoPwaAndroid512,
      setAppLogoPwaMsTile150,
      setAppName,
      appLogoLight,
      appLogoDark,
      appLogoFavicon,
      appName,
      mode,
    }),
    [appLogoLight, appLogoDark, appLogoFavicon, appName, mode]
  );

  const theme = useMemo(
    () => {
      const darkPalette = {
        page: "#0b1220",
        surface: "#111b2e",
        elevated: "#17233a",
        border: "rgba(148, 163, 184, 0.2)",
        textPrimary: "#e6edf8",
        textSecondary: "#a9b6cc",
        topbar: "#12213a",
        tabHeader: "#172740",
        input: "#131f34",
      };

      return createTheme(
        {
          scrollbarStyles: {
            "&::-webkit-scrollbar": {
              width: "8px",
              height: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
              backgroundColor: mode === "light" ? primaryColorLight : primaryColorDark,
            },
          },
          scrollbarStylesSoft: {
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: mode === "light" ? "#F3F3F3" : "#333333",
            },
          },
          typography: {
            fontFamily: [
              "Inter",
              "system-ui",
              "-apple-system",
              "BlinkMacSystemFont",
              "Segoe UI",
              "Roboto",
              "Helvetica Neue",
              "Arial",
              "sans-serif",
            ].join(","),
          },
          palette: {
            type: mode,
            primary: { main: mode === "light" ? primaryColorLight : primaryColorDark },
            textPrimary: mode === "light" ? primaryColorLight : primaryColorDark,
            borderPrimary: mode === "light" ? primaryColorLight : primaryColorDark,
            dark: { main: mode === "light" ? "#333333" : darkPalette.textPrimary },
            light: { main: mode === "light" ? "#F3F3F3" : darkPalette.elevated },
            fontColor: mode === "light" ? primaryColorLight : primaryColorDark,
            tabHeaderBackground: mode === "light" ? "#EEE" : darkPalette.tabHeader,
            optionsBackground: mode === "light" ? "#fafafa" : darkPalette.surface,
            fancyBackground: mode === "light" ? "#fafafa" : darkPalette.page,
            total: mode === "light" ? "#fff" : darkPalette.surface,
            messageIcons: mode === "light" ? "grey" : "#F3F3F3",
            inputBackground: mode === "light" ? "#FFFFFF" : darkPalette.input,
            barraSuperior: mode === "light" ? primaryColorLight : darkPalette.topbar,
            background: {
              default: mode === "light" ? "#f8fafc" : darkPalette.page,
              paper: mode === "light" ? "#ffffff" : darkPalette.surface,
            },
            text: {
              primary: mode === "light" ? "#111827" : darkPalette.textPrimary,
              secondary: mode === "light" ? "#4b5563" : darkPalette.textSecondary,
            },
            divider: mode === "light" ? "rgba(15, 23, 42, 0.1)" : darkPalette.border,
            action: {
              hover: mode === "light" ? "rgba(15, 23, 42, 0.04)" : "rgba(148, 163, 184, 0.12)",
              selected: mode === "light" ? "rgba(37, 99, 235, 0.08)" : "rgba(56, 189, 248, 0.18)",
            },
          },
          props: {
            MuiDialog: {
              scroll: "paper",
            },
          },
          overrides: {
            MuiDialog: {
              paperScrollPaper: {
                "@media (max-height:820px)": {
                  margin: 8,
                  maxHeight: "calc(100vh - 16px)",
                  display: "flex",
                  flexDirection: "column",
                },
              },
            },
            MuiDialogContent: {
              root: {
                "@media (max-height:820px)": {
                  flex: "1 1 auto",
                  minHeight: 0,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                },
              },
            },
            MuiDialogActions: {
              root: {
                "@media (max-height:820px)": {
                  position: "sticky",
                  bottom: 0,
                  zIndex: 1,
                  flexShrink: 0,
                  backgroundColor: mode === "light" ? "#ffffff" : darkPalette.surface,
                  borderTop: `1px solid ${mode === "light" ? "rgba(15, 23, 42, 0.08)" : darkPalette.border}`,
                },
              },
            },
          },
          mode,
          appLogoLight,
          appLogoDark,
          appLogoFavicon,
          appName,
          calculatedLogoDark: () => {
            if (appLogoDark === defaultLogoDark && appLogoLight !== defaultLogoLight) {
              return appLogoLight;
            }
            return appLogoDark;
          },
          calculatedLogoLight: () => {
            if (appLogoDark !== defaultLogoDark && appLogoLight === defaultLogoLight) {
              return appLogoDark;
            }
            return appLogoLight;
          },
        },
        locale
      );
    },
    [appLogoLight, appLogoDark, appLogoFavicon, appName, locale, mode, primaryColorDark, primaryColorLight]
  );

  useEffect(() => {
    const i18nlocale = localStorage.getItem("i18nextLng") || "pt-BR";
    const normalizedLocale = i18nlocale.includes("-")
      ? i18nlocale
      : `${i18nlocale}-BR`;
    const browserLocale =
      normalizedLocale.substring(0, 2) + normalizedLocale.substring(3, 5);

    if (browserLocale === "ptBR") {
      setLocale(ptBR);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("preferredTheme", mode);
  }, [mode]);

  useEffect(() => {
    getPublicSetting("primaryColorLight")
      .then((color) => {
        setPrimaryColorLight(color || "#0000FF");
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("primaryColorDark")
      .then((color) => {
        setPrimaryColorDark(color || "#39ACE7");
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoLight")
      .then((file) => {
        setAppLogoLight(resolvePublicLogoUrl(file, defaultLogoLight));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoDark")
      .then((file) => {
        setAppLogoDark(resolvePublicLogoUrl(file, defaultLogoDark));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoFavicon")
      .then((file) => {
        setAppLogoFavicon(resolvePublicLogoUrl(file, defaultLogoFavicon));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoAppleTouchIcon")
      .then((file) => {
        setAppLogoAppleTouchIcon(resolvePublicLogoUrl(file, defaultAppleTouchIcon));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoPwaAndroid192")
      .then((file) => {
        setAppLogoPwaAndroid192(resolvePublicLogoUrl(file, defaultPwaAndroid192));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoPwaAndroid512")
      .then((file) => {
        setAppLogoPwaAndroid512(resolvePublicLogoUrl(file, defaultPwaAndroid512));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appLogoPwaMsTile150")
      .then((file) => {
        setAppLogoPwaMsTile150(resolvePublicLogoUrl(file, defaultMsTile150));
      })
      .catch((error) => {
        console.log("Error reading setting", error);
      });
    getPublicSetting("appName")
      .then((name) => {
        setAppName(name || "Whaticket - V15.0.3");
      })
      .catch((error) => {
        console.log("!==== Erro ao carregar temas: ====!", error);
        setAppName("Whaticket - V15.0.3");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primaryColor", mode === "light" ? primaryColorLight : primaryColorDark);
    root.style.setProperty("--appBackground", mode === "light" ? "#ffffff" : "#0b1220");
  }, [primaryColorLight, primaryColorDark, mode]);

  useEffect(() => {
    const touchIconLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (touchIconLink) {
      touchIconLink.setAttribute("href", appLogoAppleTouchIcon || defaultAppleTouchIcon);
    }

    let msTileMeta = document.querySelector('meta[name="msapplication-TileImage"]');
    if (!msTileMeta) {
      msTileMeta = document.createElement("meta");
      msTileMeta.setAttribute("name", "msapplication-TileImage");
      document.head.appendChild(msTileMeta);
    }
    msTileMeta.setAttribute("content", appLogoPwaMsTile150 || defaultMsTile150);
  }, [appLogoAppleTouchIcon, appLogoPwaMsTile150]);

  useEffect(() => {
    const manifest = {
      short_name: appName || "Whaticket",
      name: appName || "Whaticket - V15.0.3",
      icons: [
        {
          src: appLogoFavicon || defaultLogoFavicon,
          sizes: "64x64 32x32 24x24 16x16",
          type: "image/x-icon",
        },
        {
          src: appLogoPwaAndroid192 || defaultPwaAndroid192,
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: appLogoPwaAndroid512 || defaultPwaAndroid512,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
      start_url: ".",
      display: "standalone",
      theme_color: mode === "light" ? primaryColorLight : primaryColorDark,
      background_color: mode === "light" ? "#ffffff" : "#0b1220",
      prefer_related_applications: false,
      categories: ["business", "productivity"],
      description: "Sistema de MultiAtendimento para WhatsApp",
      orientation: "any",
      scope: "/",
      shortcuts: [
        {
          name: "Iniciar atendimento",
          short_name: "Atendimento",
          description: "Iniciar novo atendimento",
          url: "/atendimento",
        },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const manifestUrl = URL.createObjectURL(blob);
    const manifestLink = document.querySelector('link[rel="manifest"]');

    if (manifestLink) {
      manifestLink.setAttribute("href", manifestUrl);
    }

    return () => URL.revokeObjectURL(manifestUrl);
  }, [
    appLogoFavicon,
    appLogoPwaAndroid192,
    appLogoPwaAndroid512,
    appName,
    mode,
    primaryColorLight,
    primaryColorDark,
  ]);

  useEffect(() => {
    async function fetchVersionData() {
      try {
        const response = await api.get("/version");
        const { data } = response;
        window.localStorage.setItem("frontendVersion", data.version);
      } catch (error) {
        console.log("Error fetching data", error);
      }
    }
    fetchVersionData();
  }, []);

  return (
    <>
      <Favicon url={appLogoFavicon || defaultLogoFavicon} />
      <ColorModeContext.Provider value={{ colorMode }}>
        <ThemeProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <ActiveMenuProvider>
  <div style={{ position: "relative", overflow: "visible", zIndex: 0, minHeight: "100dvh" }}>
    <Routes />
  </div>
            </ActiveMenuProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </>
  );
};

export default App;
