import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Hand } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const nunito = { fontFamily: "'Nunito', sans-serif" };

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") ? decodeURIComponent(searchParams.get("redirect")!) : "/";

  const handleGoogle = async () => {
    setLoading(true);
    if (redirectTo !== "/") localStorage.setItem("helve_post_login_redirect", redirectTo);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) setLoading(false);
  };

  const handleDemo = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@helve.app",
      password: "demo1234",
    });
    if (error) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: "demo@helve.app",
        password: "demo1234",
      });
      if (signUpError) {
        console.error("Demo login failed:", signUpError.message);
        setLoading(false);
        return;
      }
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("user_progress").upsert({
        user_id: user.id,
        onboarding_completed: false,
        game_step: null,
        risk_profile: null,
        risk_score: null,
        risk_scores: null,
        portfolio: null,
        simulation_result: null,
        storm_choice: null,
      }, { onConflict: "user_id" });
    }
    localStorage.removeItem("helve_skip_buy_dialog");
    navigate(redirectTo);
  };

  return (
    <motion.div
      className="min-h-screen bg-background flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <LanguageSwitcher className="absolute top-6 right-6" />
      <motion.div
        className="text-center mb-10"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <img src="/perspectiva1.png" alt="Helve" className="mx-auto mb-0 object-contain" style={{ width: 160 }} />
        <h1 className="text-3xl text-foreground" style={{ ...nunito, fontWeight: 900 }}>
          Helve
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto" style={{ ...nunito, fontWeight: 600 }}>
          {t("auth.tagline")}
        </p>
      </motion.div>

      <motion.div
        className="w-full max-w-xs flex flex-col gap-3"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <motion.button
          onClick={handleGoogle}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white text-sm shadow-md active:scale-95 transition-transform disabled:opacity-60"
          style={{ backgroundColor: "#5BB8F5", ...nunito, fontWeight: 900 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#fff"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff"/></svg>
          {t("auth.signInGoogle")}
        </motion.button>

        <motion.button
          onClick={handleDemo}
          disabled={loading}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-sm shadow-md active:scale-95 transition-transform border border-border text-foreground disabled:opacity-60"
          style={{ ...nunito, fontWeight: 900 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <Hand className="w-4 h-4" />
          {t("auth.demoUser")}
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>

      <p className="text-[10px] text-muted-foreground mt-8 text-center max-w-xs" style={nunito}>
        {t("auth.disclaimer")}
      </p>
    </motion.div>
  );
};

export default Auth;
