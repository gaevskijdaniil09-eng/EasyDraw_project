import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, Image, User, Upload, Heart, MessageSquare,
  X, Box, ArrowRight, ShieldCheck, ChevronRight, ArrowLeft,
  CheckCircle2, Circle, Sprout, Zap, Crown, ExternalLink, Send
} from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

const LEVEL_CONFIG = {
  noob: { label: 'NOOB', icon: Sprout, activeBg: 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]', hoverBorder: 'hover:border-emerald-500/50', color: 'text-emerald-400' },
  average: { label: 'AVERAGE', icon: Zap, activeBg: 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]', hoverBorder: 'hover:border-cyan-500/50', color: 'text-cyan-400' },
  pro: { label: 'PRO', icon: Crown, activeBg: 'bg-amber-950/60 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]', hoverBorder: 'hover:border-amber-500/50', color: 'text-amber-400' }
};

// Функция для декодирования userId из JWT токена
const getUserIdFromToken = (token) => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.user_id || payload.id;
  } catch (e) {
    return null;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const currentUserId = getUserIdFromToken(token);

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

  useEffect(() => {
    if (token) fetchRoadmap();
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'community') fetchPosts();
  }, [activeTab, token]);

  useEffect(() => {
    if (selectedSubNode) {
      fetchResourcesForSubNode(selectedSubNode.id);
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
    try {
      const res = await fetch(`${API_BASE}/roadmap/show/resources?subnode_id=${subnodeId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      setSubNodeResources(Array.isArray(data) ? data : []);
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
      : { user_name: username, password, role: 'user' };

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
          setAuthError('РЕГИСТРАЦИЯ УСПЕШНА. ВОЙДИТЕ В АККАУНТ.');
        }
      } else {
        const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        setAuthError(detail || "ОШИБКА АВТОРИЗАЦИИ");
      }
    } catch (e) {
      setAuthError("ОШИБКА СОЕДИНЕНИЯ С СЕРВЕРОМ");
    }
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
    try {
      const res = await fetch(`${API_BASE}/community/add/like?post_id=${postId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPosts();
      }
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
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-mono uppercase tracking-widest relative overflow-hidden p-4 select-none">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-[180px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#090d16]/90 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(168,85,247,0.15)] relative z-10">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 bg-purple-950/80 border border-purple-500/50 rounded-xl flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Box className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-xl font-extrabold text-white tracking-[0.3em]">
              EASY<span className="text-purple-400">//</span>DRAW
            </h1>
            <p className="text-[10px] text-slate-400 mt-1 normal-case font-sans">Платформа обучения и арт-сообщество</p>
          </div>

          <h2 className="text-xs font-bold text-purple-400 mb-4 tracking-widest text-center">
            {isRegister ? '// REGISTRATION_PROTOCOL' : '// AUTHORIZATION_REQUIRED'}
          </h2>

          {authError && (
            <div className="mb-4 p-2.5 bg-rose-950/40 border border-rose-500/50 rounded-lg text-[10px] text-rose-300 normal-case font-sans">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">USERNAME</label>
              <input
                type="text"
                placeholder="Введи логин..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors normal-case font-sans select-text"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 mb-1 block">PASSWORD</label>
              <input
                type="password"
                placeholder="Введи пароль..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#030712] border border-slate-800 rounded-lg px-4 py-3 text-xs text-white focus:border-purple-500 focus:outline-none transition-colors normal-case font-sans select-text"
              />
            </div>

            {isRegister && (
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">EXPERIENCE LEVEL</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(LEVEL_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = selectedLevel === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedLevel(key)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border flex flex-col items-center justify-center space-y-1.5 transition-all duration-200 ${
                          isSelected
                            ? config.activeBg
                            : `bg-[#030712] border-slate-800 text-slate-400 ${config.hoverBorder}`
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? config.color : 'text-slate-500'}`} />
                        <span className="text-[10px] tracking-wider">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-[0_0_25px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center space-x-2">
              <span>{isRegister ? 'CREATE ACCOUNT' : 'SYSTEM ACCESS'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
            className="mt-6 text-[11px] text-slate-400 hover:text-purple-400 w-full text-center transition-colors normal-case font-sans block"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#030712] text-slate-100 flex flex-col font-mono selection:bg-purple-500 selection:text-white uppercase tracking-widest relative overflow-hidden select-none">
      <header className="h-14 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-xl px-6 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { setActiveTab('roadmap'); setSelectedNode(null); setSelectedSubNode(null); }}>
            <div className="w-7 h-7 bg-purple-950/80 border border-purple-500/50 rounded-md flex items-center justify-center">
              <Box className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-[0.2em]">
              EASY<span className="text-purple-400">//</span>DRAW
            </span>
          </div>

          {selectedNode && activeTab === 'roadmap' && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 normal-case font-sans border-l border-slate-800 pl-4">
              <span className="cursor-pointer hover:text-white uppercase font-mono" onClick={() => { setSelectedNode(null); setSelectedSubNode(null); }}>Roadmap</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className={`cursor-pointer ${selectedSubNode ? 'hover:text-white' : 'text-purple-400 font-bold'}`} onClick={() => setSelectedSubNode(null)}>
                {selectedNode.name}
              </span>
              {selectedSubNode && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                  <span className="text-purple-400 font-bold font-mono">{selectedSubNode.name}</span>
                </>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => { localStorage.removeItem('access_token'); setToken(null); }}
          className="px-3 py-1.5 text-[10px] font-bold text-rose-400 border border-rose-950/60 bg-rose-950/20 hover:bg-rose-900/40 rounded-lg transition-all flex items-center space-x-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>EXIT</span>
        </button>
      </header>

      <div className="flex flex-grow overflow-hidden">
        <aside className="w-64 border-r border-slate-800/80 bg-[#090d16]/90 backdrop-blur-xl p-4 flex flex-col justify-between shrink-0 z-30">
          <nav className="space-y-2">
            {[
              { id: 'roadmap', label: '01. ROADMAP', icon: Terminal },
              { id: 'community', label: '02. GALLERY', icon: Image },
              { id: 'profile', label: '03. PROFILE', icon: User }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setSelectedNode(null); setSelectedSubNode(null); }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-300 border ${
                    isActive
                      ? 'bg-purple-950/40 text-purple-300 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)] border-l-4 border-l-purple-500'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-900/50 hover:border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3 bg-[#030712] border border-slate-800/80 rounded-xl text-[10px] text-slate-400">
            <span className="block text-purple-400 font-bold mb-1">// SYSTEM STATUS</span>
            <span className="normal-case block font-sans">Все модули синхронизированы.</span>
          </div>
        </aside>

        <main className="flex-grow p-8 relative z-10 overflow-y-auto h-[calc(100vh-3.5rem)]">
          {activeTab === 'roadmap' && (
            <>
              {!selectedNode ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="mb-8 border-b border-slate-800/80 pb-4">
                    <h1 className="text-xl font-extrabold text-white tracking-widest">// ROADMAP_NODES</h1>
                    <p className="text-slate-400 text-xs mt-1 normal-case font-sans">Выберите ключевой модуль для раскрытия его структуры.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {nodes.map((node, i) => (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node)}
                        className="bg-[#090d16]/70 border border-slate-800/80 hover:border-purple-500/50 rounded-xl p-6 transition-all duration-300 cursor-pointer group hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs text-purple-400 font-bold bg-purple-950/50 border border-purple-800/40 px-2.5 py-1 rounded-lg">
                              [{String(i + 1).padStart(2, '0')}]
                            </span>
                            <span className="text-[10px] px-2 py-0.5 border border-slate-800 text-slate-400 rounded bg-slate-900/50">
                              {node.category || 'MODULE'}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition-colors mb-2">
                            {node.name}
                          </h3>
                          <p className="text-slate-400 text-xs normal-case font-sans leading-relaxed mb-6">
                            {node.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">{(node.subnodes || []).length} SUBNODES</span>
                          <span className="text-xs text-purple-400 font-bold flex items-center group-hover:translate-x-1 transition-transform">
                            SELECT NODE <ChevronRight className="w-4 h-4 ml-1" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : !selectedSubNode ? (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors bg-[#090d16] border border-slate-800 px-3 py-1.5 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>НАЗАД К СПИСКУ NODES</span>
                  </button>

                  <div className="bg-[#090d16]/80 border border-slate-800 rounded-2xl p-8 mb-8 backdrop-blur-md">
                    <span className="text-xs text-purple-400 font-bold border border-purple-800/40 bg-purple-950/40 px-3 py-1 rounded-lg">
                      {selectedNode.category || 'NODE'}
                    </span>
                    <h1 className="text-2xl font-black text-white mt-3">{selectedNode.name}</h1>
                    <p className="text-slate-400 text-xs normal-case font-sans mt-2 max-w-2xl leading-relaxed">
                      {selectedNode.description}
                    </p>
                  </div>

                  <h2 className="text-xs font-bold text-purple-400 mb-4 tracking-widest">// SELECT_SUBNODE</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {(selectedNode.subnodes || []).map((subNode, idx) => (
                      <div
                        key={subNode.id}
                        onClick={() => setSelectedSubNode(subNode)}
                        className="bg-[#090d16]/70 border border-slate-800/80 hover:border-purple-500/50 rounded-xl p-6 transition-all duration-300 cursor-pointer group hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-xs text-purple-400 font-bold bg-purple-950/50 border border-purple-800/40 px-2.5 py-1 rounded-lg">
                              [{String(idx + 1).padStart(2, '0')}]
                            </span>
                            <span className="text-[10px] px-2 py-0.5 border border-slate-800 text-slate-400 rounded bg-slate-900/50">
                              {subNode.category || 'SUBNODE'}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-100 group-hover:text-purple-300 transition-colors mb-2">
                            {subNode.name}
                          </h3>
                          <p className="text-slate-400 text-xs normal-case font-sans leading-relaxed mb-6">
                            {subNode.description}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-slate-800/60 flex items-center justify-end">
                          <span className="text-xs text-purple-400 font-bold flex items-center group-hover:translate-x-1 transition-transform">
                            VIEW RESOURCES <ChevronRight className="w-4 h-4 ml-1" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <button
                    onClick={() => setSelectedSubNode(null)}
                    className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors bg-[#090d16] border border-slate-800 px-3 py-1.5 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>НАЗАД К SUBNODES</span>
                  </button>

                  <div className="bg-[#090d16]/80 border border-slate-800 rounded-2xl p-8 mb-8 backdrop-blur-md">
                    <span className="text-xs text-purple-400 font-bold border border-purple-800/40 bg-purple-950/40 px-3 py-1 rounded-lg">
                      {selectedSubNode.category || 'SUBNODE'}
                    </span>
                    <h1 className="text-2xl font-black text-white mt-3">{selectedSubNode.name}</h1>
                    <p className="text-slate-400 text-xs normal-case font-sans mt-2 max-w-2xl leading-relaxed">
                      {selectedSubNode.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xs font-bold text-purple-400 tracking-widest">// SUBNODE_RESOURCES</h2>
                    <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-md">
                      FOUND: {subNodeResources.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {subNodeResources.length === 0 ? (
                      <div className="bg-[#090d16]/40 border border-slate-800/80 rounded-xl p-8 text-center text-slate-500 font-sans text-xs normal-case">
                        В этой категории пока нет опубликованных ресурсов.
                      </div>
                    ) : (
                      subNodeResources.map((resource, idx) => (
                        <motion.div
                          key={resource.id}
                          layout
                          onClick={() => handleToggleResource(resource.id)}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          className={`p-5 rounded-xl border transition-all duration-300 cursor-pointer flex items-center justify-between ${
                            resource.is_completed
                              ? 'bg-purple-950/20 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] text-purple-200'
                              : 'bg-[#090d16]/60 border-slate-800 hover:border-purple-500/30 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                              resource.is_completed ? 'bg-purple-900/40 border-purple-500/50 text-purple-300' : 'bg-[#030712] border-slate-800 text-purple-400'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold normal-case font-sans">{resource.name || `Ресурс #${resource.id}`}</h4>

                              {resource.url && (
                                <a
                                  href={resource.url.startsWith('http') ? resource.url : `https://${resource.url}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center space-x-1.5 mt-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/50 hover:border-purple-500/60 text-purple-300 text-[11px] normal-case font-sans transition-colors group/link"
                                >
                                  <span className="truncate max-w-[280px]">{resource.url}</span>
                                  <ExternalLink className="w-3 h-3 text-purple-400 group-hover/link:translate-x-0.5 transition-transform shrink-0" />
                                </a>
                              )}

                              <span className="text-[10px] text-slate-500 font-sans normal-case block mt-1">
                                {resource.description || (resource.is_completed ? 'Выполнено' : 'Нажмите для изменения статуса')}
                              </span>
                            </div>
                          </div>

                          <div className="pl-4">
                            <AnimatePresence mode="wait">
                              {resource.is_completed ? (
                                <motion.div
                                  key="completed"
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.5, opacity: 0 }}
                                  className="flex items-center space-x-2 text-purple-400 font-bold text-xs"
                                >
                                  <span>COMPLETED</span>
                                  <motion.div animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 0.3 }}>
                                    <CheckCircle2 className="w-6 h-6 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                                  </motion.div>
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="mark"
                                  initial={{ scale: 0.5, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0.5, opacity: 0 }}
                                  className="flex items-center space-x-2 text-slate-500 text-xs hover:text-slate-300 transition-colors"
                                >
                                  <span>MARK DONE</span>
                                  <Circle className="w-6 h-6" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </>
          )}

          {activeTab === 'community' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex justify-between items-center mb-8 border-b border-slate-800/80 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-white tracking-widest">// COMMUNITY_GALLERY</h1>
                  <p className="text-slate-400 text-xs mt-1 normal-case font-sans">Работы участников сообщества.</p>
                </div>
                <button onClick={() => setShowPostModal(true)} className="flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                  <Upload className="w-4 h-4" />
                  <span>UPLOAD_WORK</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {posts.map(post => {
                  const likesList = post.likes || [];
                  const commentsList = post.comments || [];

                  // Проверяем, поставил ли ТЕКУЩИЙ пользователь лайк на этот пост
                  const hasUserLiked = likesList.some(l => String(l.user_id) === String(currentUserId));

                  return (
                    <div key={post.id} className="bg-[#090d16]/60 border border-slate-800 rounded-xl p-3 flex flex-col hover:border-purple-500/30 transition-all backdrop-blur-md">
                      <div className="h-56 bg-black overflow-hidden mb-3 rounded-lg border border-slate-800 relative group">
                        <img src={`${API_BASE}${post.image_url}`} alt="Art" className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300" />
                      </div>
                      <p className="text-xs text-slate-300 mb-4 normal-case font-sans flex-grow leading-relaxed">{post.description}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                        <span className="text-purple-400 font-semibold truncate max-w-[120px]">
                          USER: {post.user?.user_name || 'ANON'}
                        </span>

                        <div className="flex space-x-2">
                          <motion.button
                            onClick={() => handleToggleLike(post.id)}
                            whileTap={{ scale: 0.85 }}
                            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md border transition-all ${
                              hasUserLiked
                                ? 'bg-rose-950/50 border-rose-500 text-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${hasUserLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                            <span>{likesList.length}</span>
                          </motion.button>

                          <button
                            onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md border bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{commentsList.length}</span>
                          </button>
                        </div>
                      </div>

                      {activeCommentPostId === post.id && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80 font-sans normal-case">
                          <div className="max-h-32 overflow-y-auto space-y-2 mb-2 pr-1">
                            {commentsList.length === 0 ? (
                              <p className="text-[10px] text-slate-500 italic">Комментариев пока нет...</p>
                            ) : (
                              commentsList.map((c, i) => (
                                <div key={i} className="text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800">
                                  <span className="text-purple-400 font-bold mr-1">{c.user?.user_name || 'User'}:</span>
                                  <span className="text-slate-300">{c.text}</span>
                                </div>
                              ))
                            )}
                          </div>
                          <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Написать комментарий..."
                              value={commentInputText}
                              onChange={(e) => setCommentInputText(e.target.value)}
                              className="flex-grow bg-[#030712] border border-slate-800 rounded px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500"
                            />
                            <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-2.5 py-1 rounded text-white text-[10px]">
                              <Send className="w-3 h-3" />
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#090d16] border border-slate-800 rounded-2xl p-6 w-full max-w-lg relative">
              <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-bold text-purple-400 mb-4 tracking-widest">// UPLOAD_ARTWORK</h3>

              <form onSubmit={handleCreatePost} className="space-y-4 font-sans normal-case">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 uppercase font-mono">Описание</label>
                  <textarea
                    value={postDesc}
                    onChange={(e) => setPostDesc(e.target.value)}
                    placeholder="Расскажите о работе..."
                    className="w-full bg-[#030712] border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 uppercase font-mono">Файл изображения</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPostFile(e.target.files[0])}
                    required
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-950/60 file:text-purple-300 hover:file:bg-purple-900/80 cursor-pointer"
                  />
                </div>
                <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase font-mono tracking-widest rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
                  Опубликовать
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}