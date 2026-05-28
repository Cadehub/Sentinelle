import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../lib/supabase";
import { AlertCircle } from "lucide-react";
import PublishModal from "../components/PublishModal";

export default function Publish() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);

  // Authentication state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    navigate("/");
  };

  const handleSuccessfulSubmit = () => {
    navigate("/");
  };

  return (
    <>
      <PublishModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccessfulSubmit}
      />
    </>
  );
}
