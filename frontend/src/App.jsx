import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Image, User, Upload, CheckSquare, Square, Heart, MessageSquare, X, Box, ArrowRight, ShieldCheck, ChevronRight, ArrowLeft, CheckCircle2, Circle } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState('roadmap');
  const [token, setToken] = useState(localStorage.getItem('access_token') || null);
  const [nodes, setNodes] = useState([]);
  const [posts, setPosts] = useState([]);

  // Выбранный модуль для отображения на отдельном экране
  const [selectedNode, setSelectedNode] = useState(null);

  const [isRegister, setIsRegister] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postFile, setPostFile] = useState(null);

  useEffect(() => {
    if (token) fetchRoadmap();
  }, [token]);

  useEffect(() => {
    if (token && activeTab === 'community') fetchPosts();
  }, [activeTab, token]);

  const fetchRoadmap = async () => {
    try {
      const res = await fetch(`${API_BASE}/roadmap/`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNodes(data);
        // Если какой-то модуль уже открыт, обновляем его данные
        if (selectedNode) {
          const updated = data.find(n => n.id === selectedNode.id);
          if (updated) setSelectedNode(updated);
        }
      }
    } catch (e) { console.error("Error fetching roadmap", e); }
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
      await fetch(`${API_BASE}/roadmap/toggle?resource_id=${resourceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchRoadmap();
    } catch (e) { console.error(e); }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? '/auth/register' : '/auth/sign_in';

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: username, password, role: 'user' })
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

  // 1. ЭКРАН ВХОДА
  if (!token) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex items-center justify-center font-mono uppercase tracking-widest relative overflow-hidden p-4 select-none">
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-900/15 rounded-full blur-[180px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-[#090d16]/90 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(168,85,247,0.15)] relative z-10">
          <div className="flex flex-col items-center mb-8 text-center">
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

  // Расчет общего прогресса
  const allResources = nodes.flatMap(n => n.resources || []);
  const completedCount = allResources.filter(r => r.is_completed).length;
  const progressPercent = allResources.length ? Math.round((completedCount / allResources.length) * 100) : 0;

  // 2. ГЛАВНЫЙ ИНТЕРФЕЙС
  return (
    <div className="h-screen bg-[#030712] text-slate-100 flex flex-col font-mono selection:bg-purple-500 selection:text-white uppercase tracking-widest relative overflow-hidden select-none">

      {/* 2.1 ВЕРХНИЙ ТАСКБАР (TASKBAR) */}
      <header className="h-14 border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-xl px-6 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => { setActiveTab('roadmap'); setSelectedNode(null); }}>
            <div className="w-7 h-7 bg-purple-950/80 border border-purple-500/50 rounded-md flex items-center justify-center">
              <Box className="w-4 h-4 text-purple-400" />
            </div>
            <span className="font-extrabold text-sm text-white tracking-[0.2em]">
              EASY<span className="text-purple-400">//</span>DRAW
            </span>
          </div>

          {selectedNode && (
            <div className="flex items-center space-x-2 text-xs text-slate-400 normal-case font-sans border-l border-slate-800 pl-4">
              <span className="cursor-pointer hover:text-white" onClick={() => setSelectedNode(null)}>Roadmap</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-purple-400 font-mono font-bold uppercase">{selectedNode.name}</span>
            </div>
          )}
        </div>

        {/* Прогресс-бар в таскбаре */}
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-3 bg-[#030712] border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] text-slate-400">PROGRESS:</span>
            <div className="w-32 bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-500 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-xs text-purple-400 font-bold">{progressPercent}%</span>
          </div>

          <button
            onClick={() => { localStorage.removeItem('access_token'); setToken(null); }}
            className="px-3 py-1.5 text-[10px] font-bold text-rose-400 border border-rose-950/60 bg-rose-950/20 hover:bg-rose-900/40 rounded-lg transition-all flex items-center space-x-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>EXIT</span>
          </button>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        {/* 2.2 ЛЕВЫЙ САЙДБАР */}
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
                  onClick={() => { setActiveTab(tab.id); setSelectedNode(null); }}
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
            <span className="block text-purple-400 font-bold mb-1">// STATUS</span>
            <span className="normal-case block font-sans">Система работает в штатном режиме.</span>
          </div>
        </aside>

        {/* 2.3 ОСНОВНОЙ КОНТЕНТ */}
        <main className="flex-grow p-8 relative z-10 overflow-y-auto h-[calc(100vh-3.5rem)]">
          {activeTab === 'roadmap' && (
            <>
              {/* ПОДЭКРАН: СПИСОК ТЕМ ИЛИ ОДИН МОДУЛЬ */}
              {!selectedNode ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="mb-8 border-b border-slate-800/80 pb-4">
                    <h1 className="text-xl font-extrabold text-white tracking-widest">// ROADMAP_MODULES</h1>
                    <p className="text-slate-400 text-xs mt-1 normal-case font-sans">Выберите раздел, чтобы перейти к пошаговому обучению.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {nodes.map((node, i) => {
                      const resList = node.resources || [];
                      const done = resList.filter(r => r.is_completed).length;
                      const percent = resList.length ? Math.round((done / resList.length) * 100) : 0;

                      return (
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
                            <div className="flex items-center space-x-2">
                              <span className="text-[10px] text-slate-400">{done}/{resList.length} УРОКОВ</span>
                              <span className="text-[10px] text-purple-400 font-bold">({percent}%)</span>
                            </div>
                            <span className="text-xs text-purple-400 font-bold flex items-center group-hover:translate-x-1 transition-transform">
                              OPEN STEP <ChevronRight className="w-4 h-4 ml-1" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                /* ПОДЭКРАН: ПОШАГОВОЕ МЕНЮ ВЫБРАННОЙ ТЕМЫ */
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors bg-[#090d16] border border-slate-800 px-3 py-1.5 rounded-lg"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>НАЗАД К СПИСКУ ТЕМ</span>
                  </button>

                  <div className="bg-[#090d16]/80 border border-slate-800 rounded-2xl p-8 mb-8 backdrop-blur-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs text-purple-400 font-bold border border-purple-800/40 bg-purple-950/40 px-3 py-1 rounded-lg">
                          {selectedNode.category || 'MODULE'}
                        </span>
                        <h1 className="text-2xl font-black text-white mt-3">{selectedNode.name}</h1>
                        <p className="text-slate-400 text-xs normal-case font-sans mt-2 max-w-2xl leading-relaxed">
                          {selectedNode.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ПОШАГОВЫЙ СПИСОК УРОКОВ / РЕСУРСОВ */}
                  <h2 className="text-xs font-bold text-purple-400 mb-4 tracking-widest">// STEP_BY_STEP_LEARNING</h2>

                  <div className="space-y-3">
                    {(selectedNode.resources || []).map((resource, idx) => (
                      <div
                        key={resource.id}
                        onClick={() => handleToggleResource(resource.id)}
                        className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                          resource.is_completed
                            ? 'bg-purple-950/20 border-purple-500/40 text-purple-200'
                            : 'bg-[#090d16]/60 border-slate-800 hover:border-purple-500/30 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded-lg bg-[#030712] border border-slate-800 flex items-center justify-center font-bold text-xs text-purple-400">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold normal-case font-sans">{resource.title || resource.name || `Урок ${idx + 1}`}</h4>
                            <span className="text-[10px] text-slate-500 font-sans normal-case block">
                              {resource.is_completed ? 'Урок успешно пройден' : 'Нажми, чтобы отметить выполненным'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {resource.is_completed ? (
                            <div className="flex items-center space-x-2 text-purple-400 font-bold text-xs">
                              <span>COMPLETED</span>
                              <CheckCircle2 className="w-6 h-6 shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2 text-slate-500 text-xs">
                              <span>MARK DONE</span>
                              <Circle className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
                {posts.map(post => (
                  <div key={post.id} className="bg-[#090d16]/60 border border-slate-800 rounded-xl p-3 flex flex-col hover:border-purple-500/30 transition-all backdrop-blur-md">
                    <div className="h-56 bg-black overflow-hidden mb-3 rounded-lg border border-slate-800 relative">
                      <img src={`${API_BASE}${post.image_url}`} alt="Art" className="w-full h-full object-cover pointer-events-none" />
                    </div>
                    <p className="text-xs text-slate-300 mb-4 normal-case font-sans flex-grow leading-relaxed">{post.description}</p>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                      <span className="text-purple-400 font-semibold">USER: {post.user?.user_name || 'ANON'}</span>
                      <div className="flex space-x-3">
                        <span className="flex items-center space-x-1 text-rose-400"><Heart className="w-3.5 h-3.5" /><span>{(post.likes || []).length}</span></span>
                        <span className="flex items-center space-x-1 text-cyan-400"><MessageSquare className="w-3.5 h-3.5" /><span>{(post.comments || []).length}</span></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <div className="max-w-md bg-[#090d16]/80 border border-slate-800 rounded-xl p-8 text-center backdrop-blur-md">
              <h2 className="text-base font-bold text-white mb-2">// USER_PROFILE</h2>
              <p className="text-xs text-purple-400 font-semibold">STATUS: AUTHENTICATED</p>
            </div>
          )}
        </main>
      </div>

      {/* Модалка поста */}
      <AnimatePresence>
        {showPostModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#090d16] border border-purple-500/40 p-6 rounded-xl w-full max-w-sm relative shadow-[0_0_35px_rgba(168,85,247,0.2)]">
              <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              <h2 className="text-sm font-bold text-purple-400 mb-4 tracking-widest">// UPLOAD_WORK</h2>
              <form onSubmit={handleCreatePost} className="space-y-3">
                <input type="file" accept="image/*" onChange={e => setPostFile(e.target.files[0])} required className="w-full text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:bg-purple-950/60 file:text-purple-300 file:border file:border-purple-800/50 file:rounded-md" />
                <textarea placeholder="DESCRIPTION..." value={postDesc} onChange={e => setPostDesc(e.target.value)} required rows="3" className="w-full bg-[#030712] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-purple-500 focus:outline-none normal-case font-sans select-text" />
                <button type="submit" className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">PUBLISH</button>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}