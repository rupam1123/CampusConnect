// src/pages/SessionDetail.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../layouts/dashboard_layout";
import { io } from "socket.io-client"; // <-- NEW IMPORT
import {
  Send,
  ArrowLeft,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Reply,
  X,
} from "lucide-react";

import { API_BASE, HOSTED, readJson } from "../lib/api";

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = location.state?.courseId || "";

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const [ratings, setRatings] = useState({});
  const [feedbackText, setFeedbackText] = useState("");
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [toast, setToast] = useState("");

  const messagesEndRef = useRef(null);
  const prevCountRef = useRef(0);

  const currentUser = JSON.parse(localStorage.getItem("user")) || {};
  const currentUserId = currentUser.id || currentUser._id;
  const isStudent = currentUser.role === "Student";

  const mcqParams = [
    { key: "content", label: "Content Quality" },
    { key: "delivery", label: "Teaching Delivery" },
    { key: "clarity", label: "Concept Clarity" },
    { key: "engagement", label: "Class Engagement" },
    { key: "pace", label: "Lecture Pace" },
  ];

  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  useEffect(() => {
    if (isStudent) {
      fetch(`${API_BASE}/api/engage/session/${sessionId}/feedback-status`, {
        headers: getHeaders(),
      })
        .then(readJson)
        .then((data) => setHasSubmittedFeedback(data.submitted))
        .catch((err) => console.error(err));
    }
  }, [sessionId, isStudent]);

  // Mark this session as read on the SERVER when entering and again when leaving.
  // The cleanup (unmount) fires as the user navigates away — so lastSeenAt always
  // covers the latest Socket.IO message they saw during the chat.
  useEffect(() => {
    const markRead = () =>
      fetch(`${API_BASE}/api/engage/session/${sessionId}/mark-read`, {
        method: "POST",
        headers: getHeaders(),
      }).catch(() => {}); // fire-and-forget

    markRead(); // on enter
    return () => markRead(); // on leave
  }, [sessionId]);

  // Initial Fetch (Gets chat history when opening the page)
  useEffect(() => {
    fetch(`${API_BASE}/api/engage/session/${sessionId}/comments`, {
      headers: getHeaders(),
    })
      .then(readJson)
      .then((data) => setComments(data))
      .catch((err) => console.error(err));
  }, [sessionId]);

  // --- NEW REAL-TIME SOCKET LOGIC ---
  useEffect(() => {
    if (HOSTED) {
      let active = true;
      const refresh = async () => {
        try {
          const data = await fetch(`${API_BASE}/api/engage/session/${sessionId}/comments`, { headers: getHeaders() }).then(readJson);
          if (active) setComments(data);
        } catch (err) { if (active) setToast(err.message); }
      };
      refresh();
      const timer = setInterval(refresh, 3000);
      return () => { active = false; clearInterval(timer); };
    }
    const socket = io(API_BASE || undefined, { auth: { token: localStorage.getItem('token') } });

    // Tell the server to put us in a room specific to this class session
    socket.on('connect', () => socket.emit("join_room", sessionId));

    // Listen for messages pushed by the server
    socket.on("receive_message", (newMsg) => {
      setComments((prev) => {
        // Prevent duplicate renders if the sender already added it to their own screen
        if (prev.some((comment) => comment._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
    });

    // Cleanup when leaving the page
    return () => {
      socket.disconnect();
    };
  }, [sessionId]);
  // ----------------------------------

  useEffect(() => {
    if (comments.length > prevCountRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      prevCountRef.current = comments.length;
    }
  }, [comments]);

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const payload = { text: newComment };
    if (replyingTo) payload.replyTo = replyingTo._id;

    try {
      const res = await fetch(
        `${API_BASE}/api/engage/session/${sessionId}/comments`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Message could not be sent');
      setComments(prev => prev.some(item => item._id === data._id) ? prev : [...prev, data]);
      setNewComment("");
      setReplyingTo(null);
    } catch (err) {
      setToast(err.message);
    }
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (Object.keys(ratings).length < 5) {
      setToast("Error: Please select an option for all MCQ parameters.");
      setTimeout(() => setToast(""), 3000);
      return;
    }
    try {
      const res = await fetch(
        `${API_BASE}/api/engage/session/${sessionId}/feedback`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ courseId, ratings, comment: feedbackText }),
        },
      );
      if (res.ok) {
        setHasSubmittedFeedback(true);
        setToast("Success: Compulsory feedback securely submitted.");
        setTimeout(() => setToast(""), 4000);
      } else { const data = await res.json(); throw new Error(data.msg || 'Feedback could not be submitted'); }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    const datePart = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart}, ${timePart}`;
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-5rem)] font-sans flex flex-col relative pb-6">
        {toast && (
          <div
            className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-xl font-bold animate-in slide-in-from-top-4 flex items-center gap-3 ${toast.includes("Error") ? "bg-red-50 text-red-800 border-red-200" : "bg-emerald-50 text-emerald-800 border-emerald-200"} border`}
          >
            <CheckCircle2 size={20} />{" "}
            {toast.replace("Success: ", "").replace("Error: ", "")}
          </div>
        )}

        <button
          onClick={() => navigate("/courses", { state: { openCourseId: courseId } })}
          className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-black mb-6 w-fit transition-colors"
        >
          <ArrowLeft size={16} strokeWidth={3} /> Return to Schedule
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          <div
            className={`bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col h-[780px] overflow-hidden ${isStudent ? "lg:col-span-2" : "lg:col-span-3"}`}
          >
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between z-10">
              <h3 className="font-black text-slate-900 text-xl flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <MessageSquare size={20} />
                </div>
                Live Discussion
              </h3>
              {isStudent ? (
                <span className="bg-blue-100 text-blue-700 px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl">
                  Identity Hidden
                </span>
              ) : (
                <span className="bg-purple-100 text-purple-700 px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-xl">
                  Instructor Mode
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8f9fa] custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center text-slate-400 py-32 font-bold text-lg">
                  No messages yet. Start the anonymous discussion!
                </div>
              ) : (
                comments.map((msg) => {
                  const msgUserId = msg.user?._id || msg.user;
                  const isMe = Boolean(
                    currentUserId &&
                    msgUserId &&
                    String(msgUserId) === String(currentUserId),
                  );

                  const isProf = msg.user?.role === "Professor";
                  const displayName = isProf
                    ? msg.user?.name
                    : `@${msg.user?.username || "Unknown"}`;

                  const bubbleBg = isMe
                    ? "bg-indigo-600 text-white rounded-br-sm"
                    : isProf
                      ? "bg-purple-100 border border-purple-200 text-purple-900 rounded-bl-sm"
                      : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm";
                  const quotedBg = isMe
                    ? "bg-black/15 text-white"
                    : "bg-slate-100 text-slate-600 border-l-4 border-indigo-500";

                  return (
                    <div
                      key={msg._id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 group`}
                    >
                      <div className="flex items-end gap-2">
                        {!isMe && (
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-200"
                          >
                            <Reply size={14} />
                          </button>
                        )}

                        <div className="flex flex-col">
                          {!isMe && (
                            <span
                              className={`text-[10px] font-black uppercase mb-1 tracking-widest ${isProf ? "text-purple-600" : "text-slate-400"}`}
                            >
                              {displayName} {isProf && " (Instructor)"}
                            </span>
                          )}

                          <div
                            className={`max-w-md p-3 rounded-2xl text-sm font-medium shadow-sm relative ${bubbleBg}`}
                          >
                            {msg.replyTo && msg.replyTo.user && (
                              <div
                                className={`p-2 rounded-lg mb-2 text-[11px] ${quotedBg}`}
                              >
                                <span
                                  className={`font-black uppercase tracking-wider block mb-0.5 ${isMe ? "text-indigo-100" : "text-indigo-600"}`}
                                >
                                  {msg.replyTo.user.role === "Professor"
                                    ? msg.replyTo.user.name
                                    : `@${msg.replyTo.user.username || "Unknown"}`}
                                </span>
                                <span className="line-clamp-2 opacity-90">
                                  {msg.replyTo.text}
                                </span>
                              </div>
                            )}

                            <p className="pr-20 pb-3">{msg.text}</p>

                            <span
                              className={`absolute bottom-2 right-3 text-[9px] font-bold whitespace-nowrap ${isMe ? "text-indigo-200" : "text-slate-400"}`}
                            >
                              {formatDateTime(msg.createdAt)}
                            </span>
                          </div>
                        </div>

                        {isMe && (
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-all rounded-full hover:bg-slate-200"
                          >
                            <Reply size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t border-slate-200 flex flex-col z-10">
              {replyingTo && replyingTo.user && (
                <div className="bg-slate-100 px-6 py-3 flex items-center justify-between border-l-4 border-indigo-500">
                  <div>
                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                      Replying to{" "}
                      {replyingTo.user.role === "Professor"
                        ? replyingTo.user.name
                        : `@${replyingTo.user.username || "Unknown"}`}
                    </span>
                    <p className="text-sm text-slate-500 line-clamp-1">
                      {replyingTo.text}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-slate-400 hover:text-slate-800"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <form
                onSubmit={handleSendComment}
                className="p-4 flex gap-3 items-end"
              >
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type a message..."
                  aria-label="Message"
                  className="flex-1 px-5 py-4 bg-slate-100 border-2 border-transparent rounded-[1.5rem] outline-none focus:border-indigo-400 font-bold text-sm transition-all resize-none min-h-[56px] max-h-32 custom-scrollbar"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  disabled={!newComment.trim()}
                  className="bg-indigo-600 disabled:bg-slate-300 text-white p-4 h-[56px] rounded-[1.5rem] shadow-md hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>

          {isStudent && (
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden h-fit border-4 border-slate-800">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none"></div>

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="text-emerald-400" size={28} />
                  <h3 className="text-2xl font-black tracking-tight">
                    Session Feedback
                  </h3>
                </div>

                {hasSubmittedFeedback ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                      <CheckCircle2 size={40} strokeWidth={3} />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2">
                      Evaluation Complete
                    </h4>
                    <p className="text-slate-400 font-medium">
                      Thank you for your anonymous feedback. You have
                      successfully completed the evaluation for this session.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 text-sm font-medium mb-8">
                      Compulsory evaluation. Ratings are fully anonymous to the
                      instructor.
                    </p>
                    <form
                      onSubmit={submitFeedback}
                      className="space-y-8 animate-in fade-in"
                    >
                      {mcqParams.map((param) => (
                        <div key={param.key} className="space-y-3">
                          <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
                            {param.label}
                          </span>
                          <div className="flex gap-2 justify-between">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <button
                                type="button"
                                key={score}
                                onClick={() =>
                                  setRatings({ ...ratings, [param.key]: score })
                                }
                                className={`flex-1 py-2 rounded-lg text-sm font-black transition-all border-2 ${ratings[param.key] === score ? "bg-indigo-500 border-indigo-400 text-white shadow-lg" : "bg-slate-800 border-slate-700 text-slate-400 hover:border-indigo-500/50"}`}
                              >
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="pt-2">
                        <textarea
                          placeholder="Additional anonymous remarks (Optional)"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 text-sm font-medium outline-none focus:border-indigo-500 text-white placeholder:text-slate-500 resize-none h-24 custom-scrollbar transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-2xl font-black tracking-widest uppercase text-sm transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                      >
                        Submit Evaluation
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
