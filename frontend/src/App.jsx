import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Image, User, Upload, Heart, MessageSquare,
  X, Box, ArrowRight, ChevronRight, ArrowLeft,
  ExternalLink, Send, Shield, Check, Trophy, CheckSquare, Target
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

const LEVEL_CONFIG = {
  noob: { label: 'NOOB' },
  average: { label: 'AVERAGE' },
  pro: { label: 'PRO' }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);

  const [nodes, setNodes] = useState([]);
  const [subNodeResources, setSubNodeResources] = useState([]);
  const [posts, setPosts] = useState([]);

  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedSubNode, setSelectedSubNode] = useState(null);

  const [isRegister, setIsRegister] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('noob');
  const [authError, setAuthError] = useState('');

  const [postDesc, setPostDesc] = useState('');
  const [postFile, setPostFile] = useState(null);

  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentInputText, setCommentInputText] = useState('');

  // Вычисляем точное количество выполненных задач без дублирования
  const completedCount = subNodeResources.filter(r => r.is_completed).length;

  useEffect(() => {
    if (token) fetchRoadmap();
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'community') fetchPosts();
  }, [activeTab, token]);

  useEffect(() => {
    if (selectedSubNode) {
      const subId = selectedSubNode.id || selectedSubNode.subnode_id;
      if (subId) fetchResourcesForSubNode(subId);
    } else {
      setSubNodeResources([]);
    }
  }, [selectedSubNode]);

  const fetchRoadmap = async () => {
    try {
      const res = await fetch(`${API_BASE}/roadmap/show/nodes`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) setNodes(data);
    } catch (e) { console.error("Error fetching roadmap nodes", e); }
  };

  const fetchResourcesForSubNode = async (subnodeId) => {
    if (!subnodeId || subnodeId === 'undefined') return;
    try {
      const res = await fetch(`${API_BASE}/roadmap/show/resources?subnode_id=${subnodeId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSubNodeResources(data);
      } else {
        setSubNodeResources([]);
      }
    } catch (e) {
      console.error("Error fetching subnode resources", e);
      setSubNodeResources([]);
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/community/show/posts`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (Array.isArray(data)) setPosts(data);
    } catch (e) { console.error("Error fetching posts", e); }
  };

  const handleToggleResource = async (resourceId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/roadmap/toggle?resource_id=${resourceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const toggleData = await res.json();
        setSubNodeResources(prev => prev.map(r =>
          r.id === resourceId ? { ...r, is_completed: toggleData.resource_completed } : r
        ));
      }
    } catch (e) { console.error("Error toggling resource", e); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/sign_in';

    const bodyData = isRegister
      ? { user_name: username, password, level: selectedLevel, role: 'user' }
      : { user_name: username, password };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();

      if (res.ok) {
        if (data.access_token) {
          setToken(data.access_token);
          localStorage.setItem('access_token', data.access_token);
        } else if (isRegister) {
          setIsRegister(false);
          setAuthError('SUCCESS. PLEASE LOGIN.');
        }
      } else {
        const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        setAuthError(detail || "AUTH_FAILED");
      }
    } catch (e) {
      setAuthError("SERVER_CONNECTION_ERROR");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postFile) return;
    const formData = new FormData();
    formData.append('photo', postFile);

    try {
      const res = await fetch(`${API_BASE}/community/create/post?description=${encodeURIComponent(postDesc)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        setShowPostModal(false);
        setPostDesc('');
        setPostFile(null);
        fetchPosts();
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleLike = async (postId) => {
    // Оптимистичное обновление лайка в UI
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.is_liked_by_me;
        const currentLikes = post.likes || [];
        return {
          ...post,
          is_liked_by_me: !isLiked,
          likes: !isLiked ? [...currentLikes, { id: Date.now() }] : currentLikes.slice(0, -1)
        };
      }
      return post;
    }));

    try {
      const res = await fetch(`${API_BASE}/community/add/like?post_id=${postId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchPosts();
    } catch (e) { console.error("Error toggling like", e); }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    if (!commentInputText.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/community/add/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ post_id: postId, text: commentInputText })
      });

      if (res.ok) {
        setCommentInputText('');
        fetchPosts();
      }
    } catch (e) { console.error("Error adding comment", e); }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#05060f] text-slate-100 flex items-center justify-center font-mono uppercase tracking-widest relative overflow-hidden p-4 select-none">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#0a0c1a] border border-[#2d124d] rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(112,0,255,0.15)] relative z-10">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 bg-[#1a0833] border border-[#a855f7]/50 rounded-xl flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Box className="w-6 h-6 text-[#a855f7]" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-[0.3em]">
              EASY<span className="text-[#a855f7]">//</span>DRAW
            </h1>
          </div>

          <h2 className="text-xs font-bold text-[#a855f7] mb-4 tracking-widest text-center">
            {isRegister ? '// REGISTRATION_PROTOCOL' : '// AUTHORIZATION_REQUIRED'}
          </h2>

          {authError && (
            <div className="mb-4 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-[10px] text-rose-300">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">USERNAME</label>
              <input
                type="text"
                placeholder="Enter username..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-[#05060f] border border-[#1e1a38] rounded-lg px-4 py-3 text-xs text-white focus:border-[#a855f7] focus:outline-none transition-colors normal-case font-sans select-text"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">PASSWORD</label>
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#05060f] border border-[#1e1a38] rounded-lg px-4 py-3 text-xs text-white focus:border-[#a855f7] focus:outline-none transition-colors normal-case font-sans select-text"
              />
            </div>

            {isRegister && (
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">EXPERIENCE LEVEL</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(LEVEL_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedLevel(key)}
                      className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 ${
                        selectedLevel === key
                          ? 'bg-[#1a0833] border-[#a855f7] text-white'
                          : 'bg-[#05060f] border-[#1e1a38] text-slate-400 hover:border-[#a855f7]/50'
                      }`}
                    >
                      <span className="text-[10px] tracking-wider">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="w-full py-3.5 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold text-xs rounded-lg shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center space-x-2">
              <span>{isRegister ? 'CREATE ACCOUNT' : 'SYSTEM ACCESS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
            className="mt-6 text-[11px] text-slate-400 hover:text-[#a855f7] w-full text-center transition-colors block"
          >
            {isRegister ? 'Already registered? Sign in' : 'Need account? Register'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#05060f] text-slate-100 flex flex-col font-mono uppercase tracking-widest relative overflow-hidden select-none">

      <header className="h-14 border-b border-[#1a1c30] bg-[#070914] px-6 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setActiveTab('roadmap'); setSelectedNode(null); setSelectedSubNode(null); }}>
          <div className="w-7 h-7 bg-[#a855f7]/10 border border-[#a855f7]/40 rounded-md flex items-center justify-center">
            <Box className="w-4 h-4 text-[#a855f7]" />
          </div>
          <span className="font-extrabold text-sm tracking-[0.2em] text-white">EASY<span className="text-[#a855f7]">//</span>DRAW</span>
        </div>

        <div className="flex items-center space-x-6">
          <div className="hidden sm:flex items-center space-x-2 bg-[#0a0c1e] px-3 py-1.5 rounded-lg border border-[#1a1c30]">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] text-slate-300">TASKS: <strong className="text-emerald-400">{completedCount}</strong></span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-1.5 border border-rose-900/60 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 rounded-md text-[11px] font-bold transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>EXIT</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-[#1a1c30] bg-[#070914] flex flex-col justify-between p-4 shrink-0">
          <div className="space-y-2">
            <button
              onClick={() => { setActiveTab('roadmap'); setSelectedNode(null); setSelectedSubNode(null); }}
              className={`w-full px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 border ${
                activeTab === 'roadmap'
                  ? 'bg-gradient-to-r from-[#240d47] to-[#120826] border-[#a855f7] text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4 text-[#a855f7]" />
              <span>01. ROADMAP</span>
            </button>

            <button
              onClick={() => setActiveTab('community')}
              className={`w-full px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 border ${
                activeTab === 'community'
                  ? 'bg-gradient-to-r from-[#240d47] to-[#120826] border-[#a855f7] text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Image className="w-4 h-4 text-[#a855f7]" />
              <span>02. GALLERY</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full px-4 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-3 border ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-[#240d47] to-[#120826] border-[#a855f7] text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-[#a855f7]" />
              <span>03. PROFILE</span>
            </button>
          </div>

          <div className="p-3 bg-[#0a0c1e]/60 border border-[#1a1c30] rounded-xl space-y-1">
            <div className="text-[10px] text-[#a855f7] font-bold tracking-widest">// TASKS PROGRESS</div>
            <div className="w-full bg-[#05060f] h-2 rounded-full overflow-hidden mt-1.5 border border-[#1a1c30]">
              <div
                className="bg-gradient-to-r from-[#a855f7] to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, completedCount * 25)}%` }}
              />
            </div>
            <div className="text-[9px] text-slate-400 pt-1">
              COMPLETED: {completedCount}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 relative">

          {activeTab === 'roadmap' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-black text-white tracking-[0.2em] flex items-center space-x-2">
                  <span className="text-[#a855f7]">//</span>
                  <span>
                    {selectedSubNode
                      ? selectedSubNode.name
                      : selectedNode
                      ? selectedNode.name
                      : 'ROADMAP_NODES'}
                  </span>
                </h1>
              </div>

              {(selectedNode || selectedSubNode) && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (selectedSubNode) setSelectedSubNode(null);
                      else setSelectedNode(null);
                    }}
                    className="px-3 py-1.5 bg-[#0e1026] border border-[#1f2247] hover:border-[#a855f7] rounded-lg text-xs font-bold text-[#a855f7] transition-all flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>BACK</span>
                  </button>
                </div>
              )}

              {selectedSubNode ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  <div className="text-xs font-bold text-[#a855f7] tracking-widest uppercase mb-2">// RESOURCES</div>
                  {subNodeResources.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-[#1f2247] rounded-2xl text-xs text-slate-500">
                      NO RESOURCES AVAILABLE
                    </div>
                  ) : (
                    subNodeResources.map((res, idx) => (
                      <motion.div
                        key={res.id}
                        whileHover={{ scale: 1.005 }}
                        className={`p-5 rounded-2xl border transition-all flex items-start justify-between ${
                          res.is_completed
                            ? 'bg-[#0b1a1e]/60 border-emerald-500/40 text-slate-200'
                            : 'bg-[#0a0c1e] border-[#1a1c30] text-slate-300 hover:border-[#a855f7]/40'
                        }`}
                      >
                        <div className="flex items-start space-x-4">
                          <button
                            onClick={() => handleToggleResource(res.id)}
                            className="mt-1 focus:outline-none transition-transform active:scale-90"
                          >
                            {res.is_completed ? (
                              <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400">
                                <Check className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-md border border-[#2e325a] hover:border-[#a855f7] bg-[#05060f]" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center space-x-3">
                              <span className="text-[10px] font-bold text-[#a855f7] px-2 py-0.5 bg-[#1a0833] rounded border border-[#a855f7]/30">
                                STEP {res.step || idx + 1}
                              </span>
                              <h3 className={`text-sm font-bold ${res.is_completed ? 'line-through text-slate-400' : 'text-white'}`}>
                                {res.name}
                              </h3>
                            </div>
                            {res.description && (
                              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                {res.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {res.url && (
                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-[#1a0833] hover:bg-[#280d52] border border-[#a855f7]/40 text-[#a855f7] rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shrink-0 ml-4"
                          >
                            <span>OPEN</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </motion.div>
                    ))
                  )}
                </motion.div>
              ) : selectedNode ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedNode.subnodes && selectedNode.subnodes.length > 0 ? (
                    selectedNode.subnodes.map((sub, idx) => (
                      <div
                        key={sub.id || sub.subnode_id || idx}
                        onClick={() => setSelectedSubNode(sub)}
                        className="bg-[#0a0c1e] border border-[#1a1c30] hover:border-[#a855f7]/60 rounded-2xl p-6 cursor-pointer transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#1a0833] text-[#a855f7] border border-[#a855f7]/30">
                              [{String(idx + 1).padStart(2, '0')}]
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 bg-[#12142d] px-2.5 py-1 rounded border border-[#1a1c30]">
                              {sub.category}
                            </span>
                          </div>
                          <h2 className="text-base font-bold text-white group-hover:text-[#a855f7] transition-colors mb-2">
                            {sub.name}
                          </h2>
                          {sub.description && (
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {sub.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-[#1a1c30] flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#a855f7] transition-colors">
                          <span>OPEN SUBNODE</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-16 border border-dashed border-[#1f2247] rounded-2xl text-xs text-slate-500">
                      NO SUBNODES AVAILABLE
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {nodes.map((node, idx) => (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      className="bg-[#0a0c1e] border border-[#1a1c30] hover:border-[#a855f7]/60 rounded-2xl p-6 cursor-pointer transition-all group relative flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#1a0833] text-[#a855f7] border border-[#a855f7]/30">
                            [{String(idx + 1).padStart(2, '0')}]
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-[#12142d] px-2 py-1 rounded border border-[#1a1c30] tracking-wider">
                            {node.category}
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-white group-hover:text-[#a855f7] transition-colors mb-2">
                          {node.name}
                        </h2>
                        {node.description && (
                          <p className="text-xs text-slate-400 leading-relaxed">
                            {node.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-6 pt-4 border-t border-[#1a1c30] flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-[#a855f7] transition-colors">
                        <span>{node.subnodes?.length || 0} SUBNODES</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'community' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex justify-between items-center border-b border-[#1a1c30] pb-4">
                <div>
                  <h1 className="text-xl font-black text-white tracking-[0.2em] flex items-center space-x-2">
                    <span className="text-[#a855f7]">//</span>
                    <span>COMMUNITY_GALLERY</span>
                  </h1>
                </div>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="px-4 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>UPLOAD</span>
                </button>
              </div>

              {/* GALLERY GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => {
                  const isCommentsOpen = activeCommentPostId === post.id;
                  const isLiked = post.is_liked_by_me || (post.likes && post.likes.length > 0);

                  return (
                    <div key={post.id} className="bg-[#0a0c1e] border border-[#1a1c30] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#a855f7]/40 transition-colors">
                      <div>
                        <div className="p-3 border-b border-[#1a1c30] flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#1a0833] border border-[#a855f7]/40 flex items-center justify-center text-[10px] font-bold text-[#a855f7]">
                              {post.user?.user_name ? post.user.user_name[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white">{post.user?.user_name || 'User'}</div>
                              <div className="text-[9px] text-slate-500">{new Date(post.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#05060f] h-48 w-full overflow-hidden flex items-center justify-center">
                          <img src={`${API_BASE}${post.image_url}`} alt="Post content" className="w-full h-full object-cover" />
                        </div>

                        <div className="p-3.5 space-y-2">
                          {post.description && (
                            <p className="text-xs text-slate-300 line-clamp-2">{post.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 border-t border-[#1a1c30] bg-[#070914]/40">
                        <div className="flex items-center justify-between">
                          {/* ИСПРАВЛЕННАЯ КНОПКА ЛАЙКА */}
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => handleToggleLike(post.id)}
                            className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-pink-500 transition-colors"
                          >
                            <Heart
                              className={`w-4 h-4 transition-all duration-200 ${
                                isLiked ? 'text-pink-500 fill-pink-500 scale-110' : 'text-slate-400'
                              }`}
                            />
                            <span className={isLiked ? 'text-pink-500' : 'text-slate-400'}>
                              {post.likes?.length || 0}
                            </span>
                          </motion.button>

                          <button
                            onClick={() => setActiveCommentPostId(isCommentsOpen ? null : post.id)}
                            className="flex items-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>{post.comments?.length || 0}</span>
                          </button>
                        </div>

                        {isCommentsOpen && (
                          <div className="mt-3 pt-3 border-t border-[#1a1c30] space-y-2">
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {post.comments && post.comments.length > 0 ? (
                                post.comments.map((c) => (
                                  <div key={c.id} className="bg-[#05060f] p-2 rounded border border-[#1a1c30] text-[11px]">
                                    <span className="font-bold text-[#a855f7] mr-1">{c.author?.user_name || 'User'}:</span>
                                    <span className="text-slate-300">{c.text}</span>
                                  </div>
                                ))
                              ) : (
                                <div className="text-[10px] text-slate-500 text-center py-1">
                                  NO COMMENTS
                                </div>
                              )}
                            </div>

                            <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                placeholder="Comment..."
                                value={commentInputText}
                                onChange={(e) => setCommentInputText(e.target.value)}
                                className="flex-1 bg-[#05060f] border border-[#1a1c30] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#a855f7] focus:outline-none"
                              />
                              <button type="submit" className="p-1.5 bg-[#a855f7] text-white rounded-lg hover:bg-[#9333ea]">
                                <Send className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-[#0a0c1e] border border-[#1a1c30] rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center space-x-5">
                  <div className="w-16 h-16 bg-[#1a0833] border border-[#a855f7]/50 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#a855f7] shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                    U
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">// USER_PROFILE</h2>
                    <p className="text-xs text-slate-400 mt-1">AUTHORIZED ARTIST</p>
                  </div>
                </div>

                <div className="bg-[#12142d] border border-[#1a1c30] px-4 py-2 rounded-xl text-center">
                  <div className="text-[9px] text-slate-400">STATUS</div>
                  <div className="text-xs font-bold text-emerald-400">ONLINE</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#0a0c1e] border border-[#1a1c30] p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold">// COMPLETED TASKS</span>
                    <Trophy className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-black text-white">{completedCount}</div>
                </div>

                <div className="bg-[#0a0c1e] border border-[#1a1c30] p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold">// CURRENT LEVEL</span>
                    <Target className="w-4 h-4 text-[#a855f7]" />
                  </div>
                  <div className="text-2xl font-black text-[#a855f7] uppercase">{selectedLevel}</div>
                </div>

                <div className="bg-[#0a0c1e] border border-[#1a1c30] p-5 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-[10px] font-bold">// ROLE</span>
                    <Shield className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-black text-cyan-400">MEMBER</div>
                </div>
              </div>

              <div className="bg-[#0a0c1e] border border-[#1a1c30] rounded-2xl p-6 space-y-4">
                <div className="text-xs font-bold text-[#a855f7] tracking-widest">// TARGET OBJECTIVE</div>
                <div className="p-4 bg-[#05060f] border border-[#1a1c30] rounded-xl flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white">COMPLETE ROADMAP RESOURCES</div>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${completedCount > 0 ? 'bg-emerald-950/40 border-emerald-500 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    {completedCount > 0 ? 'IN PROGRESS' : 'NOT STARTED'}
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#0a0c1e] border border-[#1a1c30] rounded-2xl p-6 w-full max-w-lg space-y-4">
              <div className="flex justify-between items-center border-b border-[#1a1c30] pb-3">
                <h3 className="text-xs font-bold text-[#a855f7] tracking-widest">// NEW_PUBLICATION</h3>
                <button onClick={() => setShowPostModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">IMAGE FILE</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setPostFile(e.target.files[0])}
                    required
                    className="w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#1a0833] file:text-[#a855f7] border border-[#1a1c30] rounded-lg p-1 bg-[#05060f]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">DESCRIPTION</label>
                  <textarea
                    rows="3"
                    placeholder="Enter description..."
                    value={postDesc}
                    onChange={e => setPostDesc(e.target.value)}
                    className="w-full bg-[#05060f] border border-[#1a1c30] rounded-lg p-3 text-xs text-white focus:border-[#a855f7] focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="px-4 py-2 border border-[#1a1c30] text-slate-400 rounded-lg text-xs font-bold"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white rounded-lg text-xs font-bold"
                  >
                    PUBLISH
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}