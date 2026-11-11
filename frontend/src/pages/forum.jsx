import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../layouts/dashboard_layout";
import {
  Search,
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  Plus,
  CheckCircle,
  X,
  Clock,
  UserCircle,
  Send,
  Tag,
} from "lucide-react";

import { API_BASE, readJson, getHeaders } from "../lib/api";

function Forum() {
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    tag: "General",
  });

  const [expandedPostId, setExpandedPostId] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");


  const fetchPosts = useCallback(() => {
    fetch(`${API_BASE}/api/forum/posts`, { headers: getHeaders() })
      .then(readJson)
      .then((data) => setPosts(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const getAuthorDisplay = (author) => {
    if (!author) return { name: "Unknown", isProf: false };
    if (author.role === "Professor")
      return { name: `${author.name} (Professor)`, isProf: true };
    return { name: `@${author.username}`, isProf: false };
  };

  const handleVote = async (postId, currentVote, requestedVoteType) => {
    let newVoteType = requestedVoteType;
    if (currentVote === requestedVoteType) newVoteType = "none";

    setPosts(
      posts.map((p) => {
        if (p._id !== postId) return p;
        let up = p.upvoteCount;
        let down = p.downvoteCount;

        if (currentVote === "up") up--;
        if (currentVote === "down") down--;
        if (newVoteType === "up") up++;
        if (newVoteType === "down") down++;

        return {
          ...p,
          upvoteCount: up,
          downvoteCount: down,
          userVote: newVoteType === "none" ? null : newVoteType,
        };
      }),
    );

    try {
      await fetch(`${API_BASE}/api/forum/posts/${postId}/vote`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ voteType: newVoteType }),
      }).then(readJson);
    } catch (err) {
      setToastMessage(err.message);
      fetchPosts();
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    try {
      await fetch(`${API_BASE}/api/forum/posts`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(newPost),
      }).then(readJson);
      fetchPosts();
      setShowNewPostModal(false);
      setNewPost({ title: "", content: "", tag: "General" });
      setToastMessage("Your post has been published to the forum!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      setToastMessage(err.message);
    }
  };

  const toggleComments = async (postId) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
      return;
    }
    setExpandedPostId(postId);
    setComments([]);
    try {
      const res = await fetch(
        `${API_BASE}/api/forum/posts/${postId}/comments`,
        { headers: getHeaders() },
      );
      const data = await readJson(res);
      setComments(data);
    } catch (err) {
      setToastMessage(err.message);
    }
  };

  const handleCreateComment = async (e, postId) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await fetch(`${API_BASE}/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content: newComment }),
      }).then(readJson);
      setNewComment("");

      const res = await fetch(
        `${API_BASE}/api/forum/posts/${postId}/comments`,
        { headers: getHeaders() },
      );
      const data = await readJson(res);
      setComments(data);
      fetchPosts();
    } catch (err) {
      setToastMessage(err.message);
    }
  };

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tag.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const tags = ["General", "Academics", "Projects", "Study Group", "Career"];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in pb-10 relative">
        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-[100] animate-in slide-in-from-bottom-8">
            <CheckCircle size={24} />
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-emerald-200">
                Notice
              </p>
              <p className="font-bold">{toastMessage}</p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="ml-4 text-emerald-200 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* HEADER & SEARCH BAR */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Community Forum
            </h2>
            <p className="text-slate-500 mt-1 font-medium">
              Ask questions, find teammates, and discuss coursework anonymously.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-3">
            <div className="relative w-full md:w-80">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-bold text-sm"
              />
            </div>
            <button
              onClick={() => setShowNewPostModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 whitespace-nowrap active:scale-95 transition-all"
            >
              <Plus size={20} /> New Post
            </button>
          </div>
        </div>

        {/* FORUM FEED */}
        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => {
              const authorData = getAuthorDisplay(post.author);

              return (
                <div
                  key={post._id}
                  className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row transition-all hover:border-indigo-300"
                >
                  {/* VOTING COLUMN */}
                  <div className="flex flex-row md:flex-col items-center justify-center gap-1 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-100 min-w-[80px]">
                    <button
                      onClick={() => handleVote(post._id, post.userVote, "up")}
                      className={`transition-colors p-1.5 rounded-lg ${post.userVote === "up" ? "text-emerald-600 bg-emerald-100" : "text-slate-400 hover:text-emerald-600 hover:bg-slate-200"}`}
                    >
                      <ArrowBigUp
                        size={24}
                        className={post.userVote === "up" ? "fill-emerald-600" : ""}
                      />
                    </button>
                    <span className="font-black text-sm text-emerald-600">
                      {post.upvoteCount}
                    </span>
                    <div className="h-px w-8 bg-slate-200 my-1" />
                    <span className="font-black text-sm text-red-500">
                      {post.downvoteCount}
                    </span>
                    <button
                      onClick={() => handleVote(post._id, post.userVote, "down")}
                      className={`transition-colors p-1.5 rounded-lg ${post.userVote === "down" ? "text-red-600 bg-red-100" : "text-slate-400 hover:text-red-600 hover:bg-slate-200"}`}
                    >
                      <ArrowBigDown
                        size={24}
                        className={post.userVote === "down" ? "fill-red-600" : ""}
                      />
                    </button>
                  </div>

                  {/* CONTENT COLUMN */}
                  <div className="flex-1 p-6 lg:p-8 flex flex-col">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h3 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">
                        {post.title}
                      </h3>
                      <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border border-indigo-100 shrink-0">
                        {post.tag}
                      </span>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed mb-6 font-medium whitespace-pre-wrap">
                      {post.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 text-xs font-bold text-slate-500 mt-auto">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${authorData.isProf ? "bg-purple-50 text-purple-700 border border-purple-100" : "bg-slate-100 text-slate-700 border border-slate-200"}`}
                      >
                        <UserCircle size={16} /> {authorData.name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={16} /> {formatDateTime(post.createdAt)}
                      </div>

                      <button
                        onClick={() => toggleComments(post._id)}
                        className={`flex items-center gap-1.5 hover:text-indigo-600 transition-colors ml-auto px-4 py-2 rounded-xl border ${expandedPostId === post._id ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200"}`}
                      >
                        <MessageSquare
                          size={16}
                          className={
                            expandedPostId === post._id ? "fill-indigo-200" : ""
                          }
                        />
                        {expandedPostId === post._id
                          ? "Close Thread"
                          : `${post.commentsCount} Comments`}
                      </button>
                    </div>

                    {/* COMMENTS SECTION */}
                    {expandedPostId === post._id && (
                      <div className="mt-6 pt-6 border-t-2 border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-4">
                        {comments.length === 0 ? (
                          <p className="text-center text-slate-400 italic text-sm font-medium my-4">
                            Be the first to comment on this post.
                          </p>
                        ) : (
                          comments.map((comment) => {
                            const cAuthor = getAuthorDisplay(comment.author);
                            return (
                              <div
                                key={comment._id}
                                className={`p-4 rounded-2xl border ${cAuthor.isProf ? "bg-purple-50 border-purple-100" : "bg-slate-50 border-slate-200"}`}
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <span
                                    className={`text-[10px] font-black uppercase tracking-widest ${cAuthor.isProf ? "text-purple-700" : "text-slate-500"}`}
                                  >
                                    {cAuthor.name}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {formatDateTime(comment.createdAt)}
                                  </span>
                                </div>
                                <p
                                  className={`text-sm font-medium ${cAuthor.isProf ? "text-purple-900" : "text-slate-700"}`}
                                >
                                  {comment.content}
                                </p>
                              </div>
                            );
                          })
                        )}

                        <form
                          onSubmit={(e) => handleCreateComment(e, post._id)}
                          className="mt-4 flex gap-3 relative"
                        >
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full pl-5 pr-14 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-bold shadow-inner"
                          />
                          <button
                            type="submit"
                            disabled={!newComment.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg transition-all active:scale-95"
                          >
                            <Send size={16} />
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-24 bg-white rounded-[2rem] border-2 border-slate-200 border-dashed">
              <MessageSquare
                size={48}
                className="mx-auto text-slate-300 mb-4"
              />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">
                No discussions found
              </h3>
              <p className="text-slate-500 font-medium mt-2">
                Try adjusting your search or start a new post.
              </p>
            </div>
          )}
        </div>

        {/* REDESIGNED PREMIUM POST MODAL */}
        {showNewPostModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
              onClick={() => setShowNewPostModal(false)}
            ></div>

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
              {/* HEADER (Locked) */}
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                      Create a Discussion
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mt-0.5">
                      Share your thoughts anonymously or publicly.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewPostModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              {/* FORM BODY (Scrollable) */}
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <form
                  id="new-post-form"
                  onSubmit={handleCreatePost}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                        Topic
                      </label>
                      <div className="relative">
                        <Tag
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                        <select
                          value={newPost.tag}
                          onChange={(e) =>
                            setNewPost({ ...newPost, tag: e.target.value })
                          }
                          className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700 appearance-none cursor-pointer"
                        >
                          {tags.map((tag) => (
                            <option key={tag} value={tag}>
                              {tag}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newPost.title}
                        onChange={(e) =>
                          setNewPost({ ...newPost, title: e.target.value })
                        }
                        placeholder="E.g., Need help with Graph Algorithms..."
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                      Discussion Details <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      value={newPost.content}
                      onChange={(e) =>
                        setNewPost({ ...newPost, content: e.target.value })
                      }
                      placeholder="Elaborate on your topic, share context, or ask specific questions..."
                      className="w-full p-5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 resize-none h-48 text-sm font-medium text-slate-700 leading-relaxed placeholder:text-slate-400 transition-all custom-scrollbar"
                    />
                  </div>
                </form>
              </div>

              {/* FOOTER ACTIONS (Locked) */}
              <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="new-post-form"
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                >
                  <Send size={18} />
                  Publish Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Forum;
