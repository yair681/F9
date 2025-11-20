import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  LogOut, 
  Bell, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle,
  User,
  Lock,
  Search,
  Menu,
  X,
  School,
  Flower,
  MessageSquare,
  ClipboardList
} from 'lucide-react';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyBAe1m7AapkyxxDFfs6AkyYdjnpUMKSSOM",
    authDomain: "pirhei-aharon.firebaseapp.com",
    projectId: "pirhei-aharon",
    storageBucket: "pirhei-aharon.firebasestorage.app",
    messagingSenderId: "294755528900",
    appId: "1:294755528900:web:53abdaec1962c53eb31991",
    measurementId: "G-KB0FH4JY9F"
};

// Initialize Firebase (Assuming __initial_auth_token and __app_id are available in the environment 
// or setting defaults)
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId || 'school-sys'; // Using projectId as appId

// --- Constants & Types ---
const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin'
};

const SUPER_ADMIN_EMAIL = 'yairfrish2@gmail.com';
const DEFAULT_SUPER_ADMIN_PASS = 'yair12345';
const SYSTEM_NAME = "פרחי אהרון";

// --- Utility Components ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder, className = "" }) => (
  <div className={`flex flex-col gap-1 ${className}`}>
    {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none w-full"
    />
  </div>
);

const Select = ({ label, value, onChange, options, placeholder = "בחר..." }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm font-semibold text-gray-700">{label}</label>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white w-full"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

const Card = ({ title, children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {title && <div className="px-4 py-3 border-b bg-gray-50 font-bold text-gray-700">{title}</div>}
    <div className="p-4">{children}</div>
  </div>
);

// --- Main Application ---

export default function App() {
  // Global State
  const [authUser, setAuthUser] = useState(null); // Firebase Auth User
  const [userProfile, setUserProfile] = useState(null); // Firestore User Data
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('home'); // home, classes, users, profile, class-details
  const [selectedClass, setSelectedClass] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Collections
  const usersRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'users'), []);

  // --- Initialization & Auth ---
  useEffect(() => {
    const init = async () => {
      try {
        // 1. Auth Connection - Using signInAnonymously if no token is available
        // Note: For a real app, you would use a dedicated Firebase Auth flow (email/password, Google, etc.)
        // This simulates a way to get an auth user for Firestore security rules to work.
        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Initialization Failed:", error);
      }
    };

    init();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        
        // 2. Ensure Super Admin Exists
        try {
          const superAdminQuery = query(usersRef, where('email', '==', SUPER_ADMIN_EMAIL));
          const snapshot = await getDocs(superAdminQuery);
          
          if (snapshot.empty) {
            const newId = doc(usersRef).id; 
            await setDoc(doc(usersRef, newId), {
              id: newId,
              email: SUPER_ADMIN_EMAIL,
              password: DEFAULT_SUPER_ADMIN_PASS,
              name: 'יאיר פריש',
              role: ROLES.ADMIN,
              isSuperAdmin: true,
              createdAt: serverTimestamp()
            });
            console.log("Super Admin created");
          }
        } catch (err) {
          console.error("Error checking super admin:", err);
        }

        setLoading(false);
      } else {
         // This block handles initial anonymous sign-in failure, or if a user signs out from Firebase Auth
         setLoading(false); 
      }
    });

    return () => unsubscribe();
  }, [usersRef]);

  // --- Logic: Login / Logout ---
  const handleLogin = async (email, password) => {
    if (!auth.currentUser) return alert('שגיאת מערכת: לא מחובר לשרת');

    setLoading(true);
    try {
      // Find user in Firestore by email and password
      const q = query(usersRef, where('email', '==', email), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        setUserProfile(userData);
        setView('home');
      } else {
        alert('אימייל או סיסמה שגויים');
      }
    } catch (error) {
      console.error("Login error:", error);
      alert('שגיאה בהתחברות');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    setUserProfile(null);
    setView('home');
    setSelectedClass(null);
    try {
        await signOut(auth);
        // Re-authenticate anonymously to maintain connection
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Error during sign out or re-auth:", error);
    }
  };

  // --- Views ---

  if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50 text-blue-600 font-bold text-xl">טוען מערכת...</div>;

  if (!userProfile) {
    return <LandingPage onLogin={handleLogin} db={db} appId={appId} authUser={authUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans" dir="rtl">
      {/* Navbar */}
      <nav className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Flower size={24} />
              </div>
              <span className="font-bold text-xl text-blue-800 hidden sm:block">{SYSTEM_NAME}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
              <NavButton active={view === 'home'} onClick={() => setView('home')} icon={<LayoutDashboard size={18} />} label="ראשי" />
              <NavButton active={view === 'classes'} onClick={() => {setView('classes'); setSelectedClass(null);}} icon={<BookOpen size={18} />} label="כיתות" />
              {userProfile.role === ROLES.ADMIN && (
                <NavButton active={view === 'users'} onClick={() => setView('users')} icon={<Users size={18} />} label="ניהול משתמשים" />
              )}
              <NavButton active={view === 'profile'} onClick={() => setView('profile')} icon={<User size={18} />} label="פרופיל" />
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <span className="bg-gray-100 px-2 py-1 rounded">{userProfile.name}</span>
                <button onClick={handleLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="יציאה">
                  <LogOut size={18} />
                </button>
              </div>
            </div>

            <div className="flex items-center md:hidden">
               <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2">
                 {mobileMenuOpen ? <X /> : <Menu />}
               </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t p-2 flex flex-col gap-2 shadow-lg absolute w-full z-50">
            <NavButton active={view === 'home'} onClick={() => {setView('home'); setMobileMenuOpen(false);}} icon={<LayoutDashboard size={18} />} label="ראשי" />
            <NavButton active={view === 'classes'} onClick={() => {setView('classes'); setSelectedClass(null); setMobileMenuOpen(false);}} icon={<BookOpen size={18} />} label="כיתות" />
            {userProfile.role === ROLES.ADMIN && (
               <NavButton active={view === 'users'} onClick={() => {setView('users'); setMobileMenuOpen(false);}} icon={<Users size={18} />} label="ניהול משתמשים" />
            )}
            <NavButton active={view === 'profile'} onClick={() => {setView('profile'); setMobileMenuOpen(false);}} icon={<User size={18} />} label="פרופיל" />
            <button onClick={handleLogout} className="flex items-center gap-2 p-3 text-red-600 w-full hover:bg-red-50 rounded-lg border-t mt-2">
              <LogOut size={18} /> יציאה מהמערכת
            </button>
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto p-4 py-6">
        {view === 'home' && <HomeView user={userProfile} db={db} appId={appId} />}
        {view === 'users' && userProfile.role === ROLES.ADMIN && <UsersManager db={db} appId={appId} currentUser={userProfile} />}
        {view === 'classes' && !selectedClass && (
          <ClassesList 
            user={userProfile} 
            db={db} 
            appId={appId} 
            onSelectClass={(cls) => { setSelectedClass(cls); setView('class-details'); }} 
          />
        )}
        {view === 'class-details' && selectedClass && (
          <ClassDetails 
            classData={selectedClass} 
            user={userProfile} 
            db={db} 
            appId={appId} 
            onBack={() => { setSelectedClass(null); setView('classes'); }}
          />
        )}
        {view === 'profile' && <ProfileView user={userProfile} db={db} appId={appId} />}
      </main>
    </div>
  );
}

// --- Sub-Components ---

const NavButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100' : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

const LandingPage = ({ onLogin, db, appId, authUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!authUser) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), where('type', '==', 'global'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setAnnouncements(msgs);
    }, (error) => {
      console.error("Error fetching public announcements:", error);
    });
    
    return () => unsub();
  }, [db, appId, authUser]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" dir="rtl">
      <div className="bg-blue-700 text-white p-6 shadow-lg">
           <div className="max-w-6xl mx-auto flex items-center gap-3">
              <Flower size={32} />
              <h1 className="text-3xl font-bold">פורטל {SYSTEM_NAME}</h1>
           </div>
      </div>

      <div className="flex-1 max-w-6xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Login Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">כניסה למערכת</h2>
              <p className="text-gray-500 text-sm">הזן את פרטי ההתחברות שלך</p>
            </div>
            <div className="space-y-4">
              <Input label='דוא"ל' value={email} onChange={setEmail} placeholder="user@school.com" />
              <Input label="סיסמה" type="password" value={password} onChange={setPassword} placeholder="******" />
              <Button onClick={() => onLogin(email, password)} className="w-full mt-2 py-3 text-lg shadow-md" variant="primary">
                התחבר
              </Button>
            </div>
          </div>
        </div>

        {/* Public Announcements */}
        <div className="flex flex-col">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="bg-gradient-to-l from-orange-500 to-red-500 p-4 text-white flex items-center gap-2">
               <Bell className="animate-pulse" />
               <h2 className="text-xl font-bold">לוח מודעות {SYSTEM_NAME}</h2>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4 max-h-[600px]">
               {announcements.length === 0 ? (
                 <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                    <Bell size={48} className="mb-2 opacity-20"/>
                    <p>אין הודעות חדשות כרגע.</p>
                 </div>
               ) : (
                 announcements.map(msg => (
                    <div key={msg.id} className="bg-white border-r-4 border-orange-500 pl-4 py-2 shadow-sm hover:shadow transition">
                       <div className="flex items-center gap-2 mb-2">
                          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-bold">הודעה מערכתית</span>
                          <span className="text-xs text-gray-400">
                            {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('he-IL') : ''}
                          </span>
                       </div>
                       <p className="text-gray-800 text-lg leading-relaxed">{msg.content}</p>
                       <div className="mt-2 text-xs text-gray-500 border-t pt-2">
                          מאת: {msg.authorName}
                       </div>
                    </div>
                 ))
               )}
            </div>
          </div>
        </div>

      </div>
      
      <div className="text-center py-4 text-gray-400 text-sm">
        © 2024 מערכת {SYSTEM_NAME} - כל הזכויות שמורות
      </div>
    </div>
  );
};

// --- Feature Views ---

// 1. Home Dashboard
const HomeView = ({ user, db, appId }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const canPost = user.role === ROLES.ADMIN || user.role === ROLES.TEACHER;

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), where('type', '==', 'global'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
      setAnnouncements(msgs);
    });
    return () => unsub();
  }, [db, appId]);

  const postAnnouncement = async () => {
    if (!newMsg.trim()) return;
    await setDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements')), {
      content: newMsg,
      authorName: user.name,
      authorId: user.id,
      type: 'global',
      createdAt: serverTimestamp()
    });
    setNewMsg('');
  };

  const handleDeleteAnnouncement = async (id) => {
      if (confirm('למחוק הודעה זו?')) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
      }
  };

  return (
    <div className="space-y-6">
      <header className="bg-gradient-to-l from-blue-700 to-blue-500 rounded-2xl p-8 text-white shadow-lg flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">שלום, {user.name}</h1>
          <p className="opacity-90 text-lg">
            ברוכים הבאים ל{SYSTEM_NAME}
          </p>
        </div>
        <div className="hidden sm:block bg-white/20 p-4 rounded-full">
           <User size={40} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="לוח מודעות ראשי">
            {canPost && (
              <div className="mb-6 flex gap-2 bg-gray-50 p-3 rounded-lg border">
                <input 
                  type="text" 
                  className="flex-1 border rounded-lg p-2" 
                  placeholder="כתוב הודעה חדשה שתופיע לכולם (גם למי שלא מחובר)..." 
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                />
                <Button onClick={postAnnouncement} disabled={!newMsg.trim()}>פרסם</Button>
              </div>
            )}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {announcements.length === 0 ? <p className="text-gray-400 text-center py-4">אין הודעות חדשות</p> : 
                announcements.map(msg => (
                  <div key={msg.id} className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm relative group hover:border-blue-300 transition">
                    <p className="text-gray-800 text-lg">{msg.content}</p>
                    <div className="flex justify-between mt-2 text-xs text-gray-500 border-t pt-2 mt-2">
                      <span className="font-semibold text-blue-600">{msg.authorName}</span>
                      <span>{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('he-IL') : 'עכשיו'}</span>
                    </div>
                    {(canPost || user.id === msg.authorId) && (
                      <button onClick={() => handleDeleteAnnouncement(msg.id)} className="absolute top-2 left-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))
              }
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
           <Card title="מידע אישי">
             <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">תפקיד</span>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                    user.role === 'teacher' ? 'bg-orange-100 text-orange-700' : 
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {user.role === ROLES.STUDENT ? 'תלמיד' : user.role === ROLES.TEACHER ? 'מורה' : 'מנהל מערכת'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">דוא"ל</span>
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
             </div>
           </Card>
        </div>
      </div>
    </div>
  );
};

// 2. Users Manager (Admin Only)
const UsersManager = ({ db, appId, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, [db, appId]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) return alert('חסרים פרטים');
    
    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      
      if (editingId) {
        // Edit
        if (formData.email === SUPER_ADMIN_EMAIL && currentUser.email !== SUPER_ADMIN_EMAIL) {
            return alert("אין לך הרשאה לערוך משתמש זה");
        }
        const userRef = doc(usersRef, editingId);
        await updateDoc(userRef, formData);
      } else {
        // Create
        const newId = doc(usersRef).id;
        await setDoc(doc(usersRef, newId), { ...formData, id: newId, createdAt: serverTimestamp() });
      }
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', role: 'student' });
      setEditingId(null);
    } catch (e) {
      console.error(e);
      alert('שגיאה בשמירה: ודא שהאימייל אינו קיים');
    }
  };

  const handleDelete = async (user) => {
    if (user.email === SUPER_ADMIN_EMAIL) return alert('לא ניתן למחוק את מנהל המערכת הראשי');
    
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש ${user.name}? פעולה זו אינה הפיכה.`)) return;
    
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id));
    } catch (error) {
       console.error("Delete error:", error);
       alert("שגיאה במחיקת משתמש: " + error.message);
    }
  };

  const openEdit = (user) => {
    if (user.email === SUPER_ADMIN_EMAIL && currentUser.email !== SUPER_ADMIN_EMAIL) return alert("מוגן: אין לך הרשאה לערוך את מנהל העל");
    setFormData({ name: user.name, email: user.email, password: user.password, role: user.role });
    setEditingId(user.id);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">ניהול משתמשים</h2>
        <Button onClick={() => { setEditingId(null); setFormData({ name: '', email: '', password: '', role: 'student' }); setIsModalOpen(true); }}>
          <Plus size={18} /> משתמש חדש
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-700 border-b">
              <tr>
                <th className="p-4">שם</th>
                <th className="p-4">אימייל</th>
                <th className="p-4">תפקיד</th>
                <th className="p-4">סיסמה</th>
                <th className="p-4">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{u.name} {u.isSuperAdmin && '⭐'}</td>
                  <td className="p-4">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                      u.role === 'teacher' ? 'bg-orange-100 text-orange-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {u.role === 'student' ? 'תלמיד' : u.role === 'teacher' ? 'מורה' : 'מנהל'}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-gray-500">{u.password}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => openEdit(u)} className="text-blue-600 hover:bg-blue-100 p-1 rounded"><Edit size={16} /></button>
                    {u.email !== SUPER_ADMIN_EMAIL && (
                      <button onClick={() => handleDelete(u)} className="text-red-600 hover:bg-red-100 p-1 rounded"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'עריכת משתמש' : 'משתמש חדש'}>
        <div className="space-y-4">
          <Input label="שם מלא" value={formData.name} onChange={v => setFormData({...formData, name: v})} />
          <Input label='דוא"ל' value={formData.email} onChange={v => setFormData({...formData, email: v})} />
          <Input label="סיסמה" value={formData.password} onChange={v => setFormData({...formData, password: v})} />
          <Select label="תפקיד" value={formData.role} onChange={v => setFormData({...formData, role: v})} options={[
            { value: 'student', label: 'תלמיד' },
            { value: 'teacher', label: 'מורה' },
            { value: 'admin', label: 'מנהל מערכת' }
          ]} />
          <Button onClick={handleSubmit} className="w-full mt-2">שמור</Button>
        </div>
      </Modal>
    </div>
  );
};

// 3. Classes List
const ClassesList = ({ user, db, appId, onSelectClass }) => {
  const [classes, setClasses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const canCreate = user.role === ROLES.ADMIN || user.role === ROLES.TEACHER;

  useEffect(() => {
    const classesRef = collection(db, 'artifacts', appId, 'public', 'data', 'classes');
    const unsub = onSnapshot(classesRef, (snap) => {
      let all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (user.role === ROLES.STUDENT) {
        all = all.filter(c => c.students?.includes(user.id));
      } else if (user.role === ROLES.TEACHER) {
        all = all.filter(c => c.ownerId === user.id || c.teachers?.includes(user.id));
      }
      setClasses(all);
    });
    return () => unsub();
  }, [db, appId, user]);

  const handleCreateClass = async () => {
    if (!newClassName) return;
    const ref = collection(db, 'artifacts', appId, 'public', 'data', 'classes');
    const newId = doc(ref).id;
    await setDoc(doc(ref, newId), {
      id: newId,
      name: newClassName,
      ownerId: user.id,
      ownerName: user.name,
      teachers: [user.id],
      students: [],
      createdAt: serverTimestamp()
    });
    setNewClassName('');
    setIsModalOpen(false);
  };

  const handleDeleteClass = async (e, cls) => {
    e.stopPropagation();
    if (!confirm('למחוק את הכיתה? כל המידע יאבד.')) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'classes', cls.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">הכיתות שלי</h2>
        {canCreate && (
          <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> כיתה חדשה</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.length === 0 ? (
           <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
             <BookOpen size={48} className="mx-auto text-gray-300 mb-2"/>
             <p className="text-gray-500">לא נמצאו כיתות</p>
           </div>
        ) : 
          classes.map(cls => (
            <div 
              key={cls.id} 
              onClick={() => onSelectClass(cls)}
              className="bg-white rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer border border-gray-200 group relative overflow-hidden"
            >
              <div className="h-24 bg-gradient-to-r from-blue-600 to-blue-400 p-4 flex flex-col justify-end">
                <h3 className="text-white font-bold text-xl drop-shadow-md">{cls.name}</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-2 flex items-center gap-1"><User size={12}/> מורה: {cls.ownerName}</p>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 pt-3 border-t">
                   <span className="flex items-center gap-1"><Users size={14}/> {cls.students?.length || 0} תלמידים</span>
                </div>
              </div>
              
              {(user.role === ROLES.ADMIN || user.id === cls.ownerId) && (
                <button 
                  onClick={(e) => handleDeleteClass(e, cls)}
                  className="absolute top-2 left-2 bg-white/20 hover:bg-red-500 hover:text-white p-1.5 rounded-full text-white transition opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        }
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="יצירת כיתה חדשה">
        <Input label="שם הכיתה" value={newClassName} onChange={setNewClassName} placeholder="לדוגמה: מתמטיקה י'2" />
        <Button onClick={handleCreateClass} className="w-full mt-4" disabled={!newClassName}>צור כיתה</Button>
      </Modal>
    </div>
  );
};

// 4. Single Class View (Combined logic)

const ClassDetails = ({ classData, user, db, appId, onBack }) => {
  const [activeTab, setActiveTab] = useState('stream'); 
  const [messages, setMessages] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [people, setPeople] = useState({ students: [], teachers: [] });
  const [allUsers, setAllUsers] = useState([]); // All users for quick lookup

  // Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newAssignData, setNewAssignData] = useState({ title: '', desc: '' });
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [addUserType, setAddUserType] = useState(ROLES.STUDENT); 
  const [selectedUserId, setSelectedUserId] = useState('');

  const isStaff = user.role === ROLES.ADMIN || (classData.teachers && classData.teachers.includes(user.id));

  const classRef = useMemo(() => doc(db, 'artifacts', appId, 'public', 'data', 'classes', classData.id), [classData.id, db, appId]);
  const msgRef = useMemo(() => collection(classRef, 'messages'), [classRef]);
  const assignRef = useMemo(() => collection(classRef, 'assignments'), [classRef]);
  const usersRef = useMemo(() => collection(db, 'artifacts', appId, 'public', 'data', 'users'), [db, appId]);

  // Load All Users for lookup
  useEffect(() => {
    const unsub = onSnapshot(usersRef, (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [usersRef]);

  // Load Messages & Assignments (Real-time)
  useEffect(() => {
    const unsubMsg = onSnapshot(query(msgRef), (snap) => 
      setMessages(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds))
    );
    const unsubAssign = onSnapshot(query(assignRef), (snap) => 
      setAssignments(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds))
    );
    return () => { unsubMsg(); unsubAssign(); };
  }, [msgRef, assignRef]);

  // Map user IDs to full profiles (People Tab logic)
  useEffect(() => {
    if (allUsers.length === 0) return;
    
    // Find latest class data in allUsers list
    const currentClassData = allUsers.find(c => c.id === classData.id) || classData;
    
    const students = allUsers.filter(u => currentClassData.students?.includes(u.id));
    const teachers = allUsers.filter(u => currentClassData.teachers?.includes(u.id));
    
    setPeople({ students, teachers });
  }, [allUsers, classData]);

  // --- Handlers: Stream Tab ---
  const postMessage = async () => {
    if (!newMessage.trim()) return;
    await setDoc(doc(msgRef), {
      content: newMessage,
      authorName: user.name,
      authorId: user.id,
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  const handleDeleteMessage = async (id) => {
    if (!isStaff && user.id !== messages.find(m => m.id === id)?.authorId) return alert('אין הרשאה');
    if (confirm('למחוק הודעה זו?')) {
      await deleteDoc(doc(msgRef, id));
    }
  };

  // --- Handlers: Assignments Tab ---
  const handleCreateAssignment = async () => {
    if (!newAssignData.title) return alert('נא להזין כותרת');
    await setDoc(doc(assignRef), {
      ...newAssignData,
      authorName: user.name,
      authorId: user.id,
      createdAt: serverTimestamp(),
      dueDate: null, // Add due date logic later
    });
    setShowAssignModal(false);
    setNewAssignData({ title: '', desc: '' });
  };

  const handleDeleteAssignment = async (id) => {
    if (!isStaff) return alert('אין הרשאה');
    if (confirm('למחוק משימה זו?')) {
      await deleteDoc(doc(assignRef, id));
    }
  };

  // --- Handlers: People Tab ---
  const handleAddUserToClass = async () => {
    if (!selectedUserId) return;
    const arrayField = addUserType === ROLES.STUDENT ? 'students' : 'teachers';
    
    await updateDoc(classRef, {
      [arrayField]: arrayUnion(selectedUserId)
    });
    
    setShowAddUserModal(false);
    setSelectedUserId('');
  };
  
  const handleRemoveUser = async (userId, type) => {
    if (!isStaff) return alert('אין הרשאה להסיר משתמשים');
    if (userId === classData.ownerId) return alert('לא ניתן להסיר את בעל הכיתה');
    if (!confirm('האם אתה בטוח שברצונך להסיר משתמש זה?')) return;
    
    const arrayField = type === ROLES.STUDENT ? 'students' : 'teachers';
    
    await updateDoc(classRef, {
      [arrayField]: arrayRemove(userId)
    });
  };

  // Filter available users for the Add User Modal
  const availableUsers = useMemo(() => {
    if (allUsers.length === 0) return [];
    
    // Filter users based on selected role type for the modal
    const usersByRole = allUsers.filter(u => u.role === addUserType);
    
    // Filter out users already in the class
    const membersIds = [...(classData.students || []), ...(classData.teachers || [])];
    
    return usersByRole.filter(u => !membersIds.includes(u.id));
  }, [allUsers, classData.students, classData.teachers, addUserType]);
  
  
  // --- Sub-Components for Tabs ---

  const StreamTab = () => (
    <div className="space-y-6">
      {isStaff && (
        <Card title="פרסם הודעה לכיתה">
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 border rounded-lg p-2" 
              placeholder="כתוב הודעה חדשה..." 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button onClick={postMessage} disabled={!newMessage.trim()}>שלח</Button>
          </div>
        </Card>
      )}

      <Card title="לוח השידורים של הכיתה">
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {messages.length === 0 ? <p className="text-gray-400 text-center py-4">אין הודעות בכיתה</p> : 
            messages.map(msg => (
              <div key={msg.id} className="bg-gray-50 border-r-4 border-blue-500 p-4 rounded-lg shadow-sm relative group hover:border-blue-700 transition">
                <p className="text-gray-800 text-lg">{msg.content}</p>
                <div className="flex justify-between mt-2 text-xs text-gray-500 border-t pt-2 mt-2">
                  <span className="font-semibold text-blue-600">{msg.authorName}</span>
                  <span>{msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString('he-IL') : 'עכשיו'}</span>
                </div>
                {(isStaff || user.id === msg.authorId) && (
                  <button onClick={() => handleDeleteMessage(msg.id)} className="absolute top-2 left-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );

  const AssignmentsTab = () => (
    <div className="space-y-6">
      {isStaff && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAssignModal(true)}><Plus size={18}/> צור משימה חדשה</Button>
        </div>
      )}
      
      <Card title="משימות כיתה">
        <div className="space-y-4">
          {assignments.length === 0 ? <p className="text-gray-400 text-center py-4">אין משימות פתוחות כרגע</p> :
            assignments.map(a => (
              <div key={a.id} className="bg-white border-r-4 border-orange-500 p-4 rounded-lg shadow-md relative group">
                <h4 className="font-bold text-lg text-gray-800">{a.title}</h4>
                <p className="text-gray-600 text-sm mt-1">{a.desc}</p>
                <div className="flex justify-between mt-3 text-xs text-gray-500 border-t pt-2">
                   <span>מאת: {a.authorName}</span>
                   <span>פורסם: {a.createdAt ? new Date(a.createdAt.seconds * 1000).toLocaleDateString('he-IL') : 'עכשיו'}</span>
                </div>
                {isStaff && (
                  <button onClick={() => handleDeleteAssignment(a.id)} className="absolute top-2 left-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          }
        </div>
      </Card>
      
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)} title="יצירת משימה">
        <Input label="כותרת המשימה" value={newAssignData.title} onChange={v => setNewAssignData({...newAssignData, title: v})} />
        <Input label="תיאור המשימה" value={newAssignData.desc} onChange={v => setNewAssignData({...newAssignData, desc: v})} />
        {/* Date input for due date can be added here */}
        <Button onClick={handleCreateAssignment} className="w-full mt-4" disabled={!newAssignData.title}>צור משימה</Button>
      </Modal>
    </div>
  );

  const PeopleTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">משתתפים ({people.students.length + people.teachers.length})</h3>
        {isStaff && (
          <Button onClick={() => setShowAddUserModal(true)} variant="secondary">
            <Plus size={16}/> הוסף משתמש
          </Button>
        )}
      </div>

      <Card title="מורים בכיתה" className="border-l-4 border-orange-500">
        <div className="space-y-3">
          {people.teachers.length === 0 ? <p className="text-gray-400">אין מורים רשומים כרגע</p> :
            people.teachers.map(p => (
              <UserRow key={p.id} user={p} isTeacher={true} isStaff={isStaff} onRemove={() => handleRemoveUser(p.id, ROLES.TEACHER)}/>
            ))
          }
        </div>
      </Card>
      
      <Card title="תלמידים בכיתה" className="border-l-4 border-blue-500">
        <div className="space-y-3">
          {people.students.length === 0 ? <p className="text-gray-400">אין תלמידים רשומים כרגע</p> :
            people.students.map(p => (
              <UserRow key={p.id} user={p} isTeacher={false} isStaff={isStaff} onRemove={() => handleRemoveUser(p.id, ROLES.STUDENT)}/>
            ))
          }
        </div>
      </Card>
      
      <AddUserToClassModal 
        isOpen={showAddUserModal} 
        onClose={() => setShowAddUserModal(false)}
        addUserType={addUserType}
        setAddUserType={setAddUserType}
        availableUsers={availableUsers}
        selectedUserId={selectedUserId}
        setSelectedUserId={setSelectedUserId}
        onAdd={handleAddUserToClass}
      />
    </div>
  );
  
  // Tab Button Component
  const TabButton = ({ tab, label, icon }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
        activeTab === tab 
          ? 'text-blue-600 border-blue-600' 
          : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {icon} {label}
    </button>
  );


  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b pb-4">
        <Button variant="secondary" onClick={onBack}>
          <X size={16} /> חזור לכיתות
        </Button>
        <h1 className="text-3xl font-bold text-gray-800">{classData.name}</h1>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow border">
        <div className="flex border-b">
          <TabButton tab="stream" label="שידור" icon={<MessageSquare size={18} />} />
          <TabButton tab="assignments" label="משימות" icon={<ClipboardList size={18} />} />
          <TabButton tab="people" label="משתתפים" icon={<Users size={18} />} />
        </div>
        
        <div className="p-4">
          {activeTab === 'stream' && <StreamTab />}
          {activeTab === 'assignments' && <AssignmentsTab />}
          {activeTab === 'people' && <PeopleTab />}
        </div>
      </div>
    </div>
  );
};

// --- People Tab Sub-Components ---

const UserRow = ({ user, isTeacher, isStaff, onRemove }) => {
  const isOwner = user.isSuperAdmin || user.role === ROLES.ADMIN;
  
  return (
    <div className="flex justify-between items-center p-3 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        {isTeacher ? <User size={20} className="text-orange-500"/> : <School size={20} className="text-blue-500"/>}
        <span className="font-medium text-gray-800">{user.name}</span>
        {isOwner && <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">מנהל</span>}
      </div>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 hidden sm:block">{user.email}</span>
        {isStaff && !isOwner && (
          <button 
            onClick={onRemove} 
            className="text-red-500 hover:bg-red-50 p-1.5 rounded-full transition" 
            title="הסר מהכיתה"
          >
            <XCircle size={18}/>
          </button>
        )}
      </div>
    </div>
  );
};

const AddUserToClassModal = ({ isOpen, onClose, addUserType, setAddUserType, availableUsers, selectedUserId, setSelectedUserId, onAdd }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="הוספת משתמש לכיתה">
    <div className="space-y-4">
      <Select 
        label="סוג משתמש להוספה" 
        value={addUserType} 
        onChange={setAddUserType} 
        options={[
          { value: ROLES.STUDENT, label: 'תלמיד' },
          { value: ROLES.TEACHER, label: 'מורה' },
        ]} 
      />
      
      <Select 
        label={`בחר ${addUserType === ROLES.STUDENT ? 'תלמיד' : 'מורה'}`} 
        value={selectedUserId} 
        onChange={setSelectedUserId} 
        options={availableUsers.map(u => ({ value: u.id, label: `${u.name} (${u.email})` }))}
        placeholder={availableUsers.length === 0 ? "אין משתמשים פנויים בתפקיד זה" : "בחר משתמש"}
      />
      
      <Button onClick={onAdd} className="w-full mt-4" disabled={!selectedUserId}>
        <Plus size={18}/> הוסף לכיתה
      </Button>
    </div>
  </Modal>
);

// 5. Profile View (Placeholder)

const ProfileView = ({ user, db, appId }) => {
    // In a full app, this would allow changing password/details.
    // Since we store password in Firestore and not Firebase Auth, password change needs a Firestore update.
    return (
        <Card title="עמוד פרופיל אישי">
            <div className="space-y-4">
                <p className="text-lg">שלום, {user.name}</p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p><strong>דוא"ל:</strong> {user.email}</p>
                    <p><strong>תפקיד:</strong> {user.role === ROLES.STUDENT ? 'תלמיד' : user.role === ROLES.TEACHER ? 'מורה' : 'מנהל מערכת'}</p>
                    <p className="text-sm text-gray-600">בכדי לשנות פרטים אישיים, אנא פנה למנהל המערכת.</p>
                </div>
            </div>
        </Card>
    );
}