import React, { useState, useEffect } from 'react';
// ייבוא קונפיגורציה בסיסית ורכיבי Firebase
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword // יובא לצורך לוגין
} from 'firebase/auth';
import { 
  getFirestore,
  doc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  setDoc,
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  LogOut, 
  Plus,
  Flower,
  Trash2,
  Lock,
  UserCheck,
  Zap,
  MessageSquare,
  Send
} from 'lucide-react';
import './App.css';
import './index.css';


// --- הגדרות קבועות ---

// קונפיגורציה סטטית של Firebase (כברירת מחדל אם אין גלובלית)
const STATIC_FIREBASE_CONFIG = {
    apiKey: "AIzaSyBAe1m7AapkyxxDFfs6AkyYdjnpUMKSSOM",
    authDomain: "pirhei-aharon.firebaseapp.com",
    projectId: "pirhei-aharon",
    storageBucket: "pirhei-aharon.firebasestorage.app",
    messagingSenderId: "294755528900",
    appId: "1:294755528900:web:caab9ed4e16f195db31991",
};

// גלובליות המסופקות על ידי הקנבס
const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// בחירת הקונפיגורציה: קונפיגורציית Canvas קודמת, אחרת סטטית
const firebaseConfig = Object.keys(canvasFirebaseConfig).length > 0 ? canvasFirebaseConfig : STATIC_FIREBASE_CONFIG;


// אתחול Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const SUPER_ADMIN_EMAIL = 'yairfrish2@gmail.com'; // המנהל הראשי הקבוע
const SUPER_ADMIN_PASSWORD_DEFAULT = 'yair12345'; // סיסמת ברירת מחדל (הערה: אינה מאמתת אוטומטית)

// הגדרות תפקידים (Roles)
const ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};


// --- רכיבים בסיסיים ---

// רכיב כפתור רגיל עם עיצוב משופר
const Button = ({ children, onClick, className = '', disabled = false, type = 'button' }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-bold text-lg transition duration-300 ease-in-out transform hover:scale-[1.01] shadow-lg hover:shadow-xl ${
            disabled 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-inner' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
        } ${className}`}
        disabled={disabled}
        type={type}
    >
        {children}
    </button>
);

// רכיב כרטיס עם עיצוב משופר
const Card = ({ title, children, className = '' }) => (
    <div className={`p-8 bg-white shadow-2xl rounded-2xl border border-gray-100 ${className}`}>
        <h2 className="text-3xl font-extrabold mb-5 border-b-2 pb-3 text-indigo-800">{title}</h2>
        {children}
    </div>
);


// --- רכיב לוח ההודעות (School Bulletin) ---

const SchoolMessages = ({ isAdmin, currentUser, db, appId }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [feedback, setFeedback] = useState('');

    // נתיב ציבורי גלובלי
    const messagesCollectionRef = collection(db, "artifacts", appId, "public", "data", "schoolMessages");

    // טעינת הודעות
    useEffect(() => {
        // אם אין db או אם המערכת עדיין לא עברה אימות ראשוני, יוצאים.
        if (!db) return;

        // שאילתה: טען את 10 ההודעות האחרונות לפי זמן יצירה
        const q = query(messagesCollectionRef); 
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs
                .map(doc => ({ 
                    id: doc.id, 
                    ...doc.data(),
                    // הפיכת ה-timestamp לאובייקט Date
                    timestamp: doc.data().timestamp ? doc.data().timestamp.toDate() : new Date()
                }))
                .sort((a, b) => b.timestamp - a.timestamp) // מיון מהחדש לישן
                .slice(0, 10); // הצג רק 10 הודעות אחרונות
            setMessages(list);
        }, (error) => {
            // זה המקום בו הופיעה שגיאת ההרשאות - היא תופיע אם המשתמש לא מחובר
            // כאשר נשתמש ב-signInAnonymously זה יפתור את הבעיה עבור קריאה ציבורית
            console.error("Error fetching school messages:", error);
        });

        return () => unsubscribe();
    }, [db, appId]);

    // פרסום הודעה חדשה (רק מנהל)
    const handlePostMessage = async () => {
        if (!isAdmin || !newMessage.trim()) return;

        try {
            await addDoc(messagesCollectionRef, {
                text: newMessage.trim(),
                timestamp: serverTimestamp(),
                authorName: currentUser.name || 'מנהל ראשי',
                authorId: currentUser.uid,
            });
            setNewMessage('');
            setFeedback('✅ ההודעה פורסמה בהצלחה!');
        } catch (error) {
            setFeedback(`🛑 שגיאה בפרסום: ${error.message}`);
        }
    };

    // מחיקת הודעה (רק מנהל)
    const handleDeleteMessage = async (messageId) => {
        if (!isAdmin) return;

        try {
            await deleteDoc(doc(messagesCollectionRef, messageId));
            setFeedback('✅ ההודעה נמחקה בהצלחה.');
        } catch (error) {
            setFeedback(`🛑 שגיאה במחיקה: ${error.message}`);
        }
    };


    return (
        <Card title="לוח הודעות בית ספרי" className="min-h-[500px] border-indigo-300">
            {isAdmin && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="פרסם הודעה חדשה לבית הספר..."
                        className="w-full p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                    />
                    <Button 
                        onClick={handlePostMessage} 
                        className="mt-3 w-full bg-green-600 hover:bg-green-700 text-sm"
                        disabled={!newMessage.trim()}
                    >
                        <Send size={18} /> פרסם הודעה
                    </Button>
                    {feedback && <p className={`mt-2 text-xs font-bold ${feedback.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{feedback}</p>}
                </div>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                    <p className="text-gray-500 p-4 border rounded-xl text-center">אין הודעות חדשות כרגע.</p>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className="p-4 bg-indigo-50 rounded-xl shadow-sm border border-indigo-200 relative">
                            <p className="text-gray-800 text-md whitespace-pre-wrap">{msg.text}</p>
                            <div className="mt-2 text-xs text-gray-500 flex justify-between items-center pt-2 border-t border-indigo-100">
                                <span className='font-semibold'>פורסם ע"י: {msg.authorName}</span>
                                <span>{msg.timestamp.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                            {isAdmin && (
                                <button 
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="absolute top-2 left-2 p-1 text-red-500 hover:text-red-700 transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </Card>
    );
};


// --- הרכיב הראשי של האפליקציה ---

function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState(''); 
  const [loginPassword, setLoginPassword] = useState(''); 
  const [loginMessage, setLoginMessage] = useState('');
  const [superAdminEmail] = useState(SUPER_ADMIN_EMAIL); 
  const [superAdminPassword, setSuperAdminPassword] = useState(SUPER_ADMIN_PASSWORD_DEFAULT);
  const [registrationComplete, setRegistrationComplete] = useState(null); 
  
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [view, setView] = useState('dashboard'); 
  const [authReady, setAuthReady] = useState(false); 


  // 1. אתחול אימות (Auth) - מנסה להתחבר עם טוקן קנבס או אנונימי
  useEffect(() => {
    const initializeAuth = async () => {
        try {
            // נסה להתחבר עם הטוקן המותאם אישית של הקנבס
            if (initialAuthToken) {
                await signInWithCustomToken(auth, initialAuthToken);
            } else {
                // אם אין טוקן (או אם נכשל), התחבר כאנונימי כדי לקבל UID עבור כללי האבטחה
                await signInAnonymously(auth);
            }
        } catch (error) {
            console.error("🛑 Failed to use initial auth token or sign in anonymously. User will be logged out.", error);
            // אם הכל נכשל, נצא בכל מקרה וניתן ל-onAuthStateChanged לטפל בזה
        }
        
        // עכשיו שהמשתמש מאומת (אנונימי או עם טוקן), ניתן להפעיל את ה-onAuthStateChanged
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthReady(true);
            
            if (user && !user.isAnonymous) { // משתמש מחובר (לא אנונימי)
                try {
                    const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", user.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setCurrentUser({ uid: user.uid, role: userData.role, email: userData.email, name: userData.name });
                        
                        // אם זה המנהל הראשי (שנוצר דרך הקוד), נגדיר לו שם קבוע
                        if (userData.email === SUPER_ADMIN_EMAIL && !userData.name) {
                            setCurrentUser(prev => ({ ...prev, name: 'המנהל הקבוע' }));
                            // עדכון חד פעמי ב-Firestore אם השם חסר
                            await setDoc(doc(db, "artifacts", appId, "public", "data", "users", user.uid), { name: 'המנהל הקבוע' }, { merge: true });
                        }

                    } else {
                        // המשתמש מחובר ב-Auth, אבל חסר פרופיל Firestore (משתמש לא מאושר)
                        // זה יקרה אם משתמש נרשם מחוץ לאפליקציה (שזה נכון לקנבס), לכן נחסום אותו
                        console.warn(`⚠️ User ${user.uid} authenticated but Firestore profile is missing. Logging out for security.`);
                        await signOut(auth); // יציאה מיידית
                        setCurrentUser(null);
                        setLoginMessage('התחברת עם משתמש שלא נוצר על ידי מנהל המערכת. אנא פנה למנהל.');
                    }
                } catch(error) {
                    console.error("Error fetching user data after auth:", error);
                    setCurrentUser(null);
                }
            } else {
                // משתמש אנונימי או מנותק - מנקה משתמש
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    };

    initializeAuth();
  }, []); // רץ פעם אחת בטעינת הקומפוננטה


  // 2. בדיקה האם קיים Super Admin במערכת
  useEffect(() => {
    // רץ רק אם ה-Auth מוכן ואין משתמש מחובר (משתמש אנונימי/מנותק)
    if (authReady && !currentUser) { 
        const checkSuperAdmin = async () => {
          try {
            // ה-Query הזה הוא אחד ממקורות שגיאות ההרשאות - הוא צריך להתבצע רק אחרי שהמשתמש מאומת (אנונימי לפחות)
            const q = query(collection(db, "artifacts", appId, "public", "data", "users"), where("role", "==", ROLES.ADMIN));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
              setRegistrationComplete(false); // אין אדמין, פתח הרשמה
            } else {
              setRegistrationComplete(true); // יש אדמין, הצג לוגין
            }
          } catch (error) {
            console.error("🛑 Error checking super admin. Assuming registration is complete.", error);
            // אם יש שגיאת הרשאה כאן, כנראה שהאימות האנונימי לא עבד או כללי האבטחה נוקשים מדי.
            // במקרה של שגיאה, נניח שההרשמה הושלמה כדי לא לחסום את המשתמש
            setRegistrationComplete(true); 
          }
        };

        checkSuperAdmin();
    } else if (!authReady) {
        setRegistrationComplete(null); 
    }
  }, [currentUser, authReady]);


  // 3. לוגיקת יצירת Super Admin (הרשמה ראשונית)
  const handleSuperAdminRegister = async () => {
    if (superAdminEmail !== SUPER_ADMIN_EMAIL) {
        setLoginMessage(`הרשמה ראשונית אפשרית רק עם האימייל: ${SUPER_ADMIN_EMAIL}`);
        return;
    }
    if (superAdminPassword.length < 6) {
        setLoginMessage("הסיסמה חייבת להיות לפחות 6 תווים.");
        return;
    }
    setLoading(true);

    try {
      // 1. יצירת המשתמש ב-Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, superAdminEmail, superAdminPassword); 

      // 2. יצירת מסמך המשתמש ב-Firestore עם תפקיד ADMIN
      await setDoc(doc(db, "artifacts", appId, "public", "data", "users", userCredential.user.uid), {
        email: superAdminEmail,
        role: ROLES.ADMIN,
        name: 'המנהל הקבוע', // שם קבוע
        createdAt: serverTimestamp()
      });

      setCurrentUser({ uid: userCredential.user.uid, role: ROLES.ADMIN, email: superAdminEmail, name: 'המנהל הקבוע' });
      setRegistrationComplete(true);
      setLoginMessage('✅ המנהל הראשי נוצר והתחברת בהצלחה!');

    } catch (error) {
      console.error("🛑 Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginMessage(`🛑 אימייל זה (${SUPER_ADMIN_EMAIL}) כבר רשום. אנא התחבר.`);
      } else {
        setLoginMessage(`🛑 שגיאת הרשמה: ${error.message}`);
      }
    } finally {
        setLoading(false);
    }
  };


  // 4. לוגיקת ההתחברות (בדיקת אישור מנהל)
  const handleLogin = async () => {
    if (!loginEmail.includes('@') || loginPassword.length < 6) {
        setLoginMessage('אנא הזן כתובת אימייל מלאה וסיסמה חוקית (6+ תווים).');
        setLoginPassword('');
        return;
    }
    
    setLoginMessage('');
    setLoading(true);

    try {
      // שלב 1: התחברות באמצעות Auth
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userId = userCredential.user.uid;
      
      // שלב 2: בדיקת פרופיל Firestore (בדיקת "מאושר" על ידי מנהל)
      // אם אין מסמך Firestore, המשתמש לא נוצר דרך האפליקציה וייחסם ב-onAuthStateChanged
      const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", userId));

      if (userDoc.exists()) {
        // ה-onAuthStateChanged יטפל כעת בהגדרת currentUser
        setLoginMessage('');
      } else {
        // אם המשתמש מחובר אבל אין לו מסמך, נתנתק
        await signOut(auth);
        setLoginMessage('שגיאת אבטחה: משתמש זה אינו מאושר על ידי מנהל המערכת. פנה למנהל.');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('🛑 FIREBASE LOGIN ERROR CODE:', error.code);
      
      setLoginPassword(''); 

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginMessage('אימייל או סיסמה שגויים. וודא שהזנת כתובת אימייל מלאה!');
      } else {
        setLoginMessage(`שגיאת התחברות: ${error.message}`);
      }
      setCurrentUser(null);
    } finally {
        setLoading(false);
    }
  };


  // 5. לוגיקת יציאה (Logout)
  const handleLogout = async () => {
    // חשוב: לאחר יציאה, אנחנו נכנסים מחדש כאנונימיים כדי לשמור על הרשאות קריאה ציבוריות
    await signOut(auth);
    await signInAnonymously(auth); 
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setLoginMessage('התנתקת בהצלחה. אתה עדיין יכול לצפות בהודעות הבית ספריות.');
    setView('dashboard'); 
  };


  // 6. טעינת נתונים
  useEffect(() => {
    if (currentUser && currentUser.uid && db && appId && currentUser.role) {
        if (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.TEACHER) {
            const usersCollectionRef = collection(db, "artifacts", appId, "public", "data", "users");

            const qTeachers = query(usersCollectionRef, where("role", "==", ROLES.TEACHER));
            const qStudents = query(usersCollectionRef, where("role", "==", ROLES.STUDENT));
            
            const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTeachers(list);
            }, (error) => {
                console.error("Error fetching teachers:", error);
            });

            const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
                const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStudents(list);
            }, (error) => {
                console.error("Error fetching students:", error);
            });

            return () => {
                unsubscribeTeachers();
                unsubscribeStudents();
            };
        }
    } else {
        setTeachers([]);
        setStudents([]);
    }
  }, [currentUser, authReady]);


  // 7. רכיבי Render

  // הצג טעינה
  if (loading || (!authReady && !currentUser) || registrationComplete === null) { 
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center p-12 bg-white shadow-2xl rounded-2xl">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-6"></div>
                <p className="text-xl font-semibold text-indigo-700">טוען מערכת...</p>
            </div>
        </div>
    );
  }

  // מסך 1: הרשמת Super Admin ראשונה
  if (registrationComplete === false && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 bg-gradient-to-br from-indigo-100 to-white">
        <div className="p-10 bg-white shadow-2xl rounded-2xl w-full max-w-lg text-center border-t-4 border-indigo-600">
          <h2 className="text-3xl font-extrabold mb-8 text-indigo-800 flex items-center justify-center space-x-3">
             <Zap size={28}/> הרשמת מנהל-על
          </h2>
          <p className="mb-6 text-md text-gray-600 p-3 bg-yellow-50 rounded-lg">
             יש להשתמש באימייל הקבוע: **{SUPER_ADMIN_EMAIL}**
          </p>
          <input
            type="email"
            placeholder="אימייל מנהל"
            className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 text-left"
            value={superAdminEmail}
            dir="ltr"
            readOnly={true} // האימייל נעול כדי לוודא שזה המנהל הקבוע
          />
          <input
            type="password"
            placeholder="סיסמה (לפחות 6 תווים)"
            className="w-full p-4 mb-8 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100"
            value={superAdminPassword}
            onChange={(e) => setSuperAdminPassword(e.target.value)}
          />
          <Button
            onClick={handleSuperAdminRegister}
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={!superAdminEmail || !superAdminPassword}
          >
            הרשם והתחבר כמנהל
          </Button>
          {loginMessage && <p className="mt-5 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-300 text-red-700">{loginMessage}</p>}
        </div>
      </div>
    );
  }

  // מסך 2: מסך התחברות (כולל לוח הודעות בצד)
  if (!currentUser) {
    return (
        <div className="flex min-h-screen bg-gray-50 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex-1 flex items-center justify-center p-10">
                <div className="p-10 bg-white shadow-2xl rounded-2xl w-full max-w-lg text-center border-t-4 border-green-600">
                    <h2 className="text-4xl font-black mb-8 text-green-800 flex items-center justify-center space-x-3">
                        <Lock size={32}/> כניסה למערכת
                    </h2>
                    
                    <p className="mb-6 text-sm text-gray-600 p-3 bg-blue-50 rounded-xl border border-blue-200">
                        רק משתמשים שנוצרו ואושרו על ידי מנהל רשאים להיכנס.
                    </p>

                    <input
                        type="email"
                        placeholder="אימייל מלא (חובה!)"
                        className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-100 text-left"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        dir="ltr"
                    />
                    <input
                        type="password"
                        placeholder="סיסמה"
                        className="w-full p-4 mb-8 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-100"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                    />
                    <Button
                        onClick={handleLogin}
                        className="w-full bg-green-600 hover:bg-green-700"
                        disabled={!loginEmail || !loginPassword}
                    >
                        התחבר
                    </Button>
                    {loginMessage && <p className="mt-5 text-sm font-bold bg-red-50 p-3 rounded-lg border border-red-300 text-red-700">{loginMessage}</p>}
                </div>
            </div>
            {/* חלון הודעות בצד שמאל של מסך הכניסה */}
            <div className="w-96 p-10 bg-gray-100 border-r border-gray-200 flex-shrink-0">
                {/* SchoolMessages עדיין פועל מכיוון שהתחברנו כאנונימיים */}
                <SchoolMessages isAdmin={false} db={db} appId={appId} />
            </div>
        </div>
    );
  }

  // מסך 3: דאשבורד (Dashboard) לאחר התחברות
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* סרגל ניווט צדדי */}
      <nav className="w-72 bg-white shadow-2xl p-6 flex flex-col items-center border-l">
        <div className="flex items-center space-x-2 mb-12 text-indigo-700">
            <Flower size={40} className="text-green-500"/> 
            <span className="text-3xl font-extrabold">פרחי אהרון</span>
        </div>
        
        {/* קישורי ניווט */}
        <div className="space-y-3 w-full">
            <NavItem icon={LayoutDashboard} label="דאשבורד" currentView={view} target="dashboard" setView={setView} />
            <NavItem icon={MessageSquare} label="הודעות ביה" currentView={view} target="messages" setView={setView} />
            {currentUser.role === ROLES.ADMIN && (
                <>
                    <NavItem icon={Users} label="ניהול משתמשים" currentView={view} target="users" setView={setView} />
                    <NavItem icon={BookOpen} label="ניהול כיתות" currentView={view} target="classes" setView={setView} />
                </>
            )}
            <NavItem icon={UserCheck} label="הנתונים שלי" currentView={view} target="profile" setView={setView} />
        </div>

        {/* יציאה */}
        <div className="mt-auto w-full pt-8 border-t border-gray-100">
            <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-4 font-extrabold rounded-xl transition duration-200 text-red-600 hover:bg-red-50 hover:shadow-inner"
            >
                <LogOut size={20} />
                <span>התנתק</span>
            </button>
            <p className="mt-4 text-xs text-gray-500 text-center p-2 bg-gray-100 rounded-lg">
                <span className="font-bold">מחובר:</span> {currentUser.email}<br/>
                <span className="font-bold">תפקיד:</span> {currentUser.role}
            </p>
        </div>
      </nav>

      {/* אזור תוכן ראשי */}
      <main className="flex-1 p-12 bg-gray-100">
        <header className="pb-8 border-b border-gray-200 mb-10">
          <h1 className="text-5xl font-black text-gray-800">
            {
                view === 'dashboard' ? 'דאשבורד ראשי' :
                view === 'users' ? 'ניהול משתמשים' :
                view === 'classes' ? 'ניהול כיתות' :
                view === 'messages' ? 'לוח הודעות בית ספרי' :
                view === 'profile' ? 'הפרופיל שלי' : 'עמוד לא נמצא'
            }
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            ברוך הבא, {currentUser.name || currentUser.email}! 
          </p>
        </header>

        {/* תוכן לפי View */}
        {view === 'dashboard' && <DashboardView currentUser={currentUser} teachers={teachers} students={students} />}
        {view === 'messages' && <SchoolMessages isAdmin={currentUser.role === ROLES.ADMIN} currentUser={currentUser} db={db} appId={appId} />}
        {view === 'users' && currentUser.role === ROLES.ADMIN && <AdminUsersView students={students} teachers={teachers} appId={appId} db={db} currentUser={currentUser} />}
        {view === 'classes' && currentUser.role === ROLES.ADMIN && <AdminClassesView teachers={teachers} students={students} classes={[]} appId={appId} db={db} />}
        {view === 'profile' && <Card title="הנתונים שלי"><p>פרטים אישיים יופיעו כאן.</p></Card>}

      </main>
    </div>
  );
}

// רכיב לניווט
const NavItem = ({ icon: Icon, label, currentView, target, setView }) => (
    <button
        className={`flex items-center space-x-3 w-full p-4 font-extrabold rounded-xl transition duration-200 ${
            currentView === target
                ? 'bg-indigo-600 text-white shadow-lg transform scale-[1.02]'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-700'
        }`}
        onClick={() => setView(target)}
    >
        <Icon size={22} />
        <span>{label}</span>
    </button>
);


// רכיבי View
const DashboardView = ({ currentUser, teachers, students }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="מורים" className="bg-blue-50 border-blue-200">
            <p className="text-5xl font-black text-blue-700">{teachers.length}</p>
        </Card>
        <Card title="תלמידים" className="bg-green-50 border-green-200">
            <p className="text-5xl font-black text-green-700">{students.length}</p>
        </Card>
        <Card title="הודעות חדשות" className="bg-yellow-50 border-yellow-200">
            <p className="text-5xl font-black text-yellow-700">...</p>
        </Card>
        <Card title={`שלום, ${currentUser.name || 'משתמש'}`} className="md:col-span-3 bg-gray-50">
            <p className="text-gray-600">
                זהו הדאשבורד הראשי של המערכת. התפקיד שלך: 
                <span className="font-bold text-indigo-600 mr-1">{currentUser.role === ROLES.ADMIN ? 'מנהל' : currentUser.role === ROLES.TEACHER ? 'מורה' : 'תלמיד'}</span>
            </p>
        </Card>
    </div>
);

const AdminUsersView = ({ students, teachers, appId, db, currentUser }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState(ROLES.STUDENT);
    const [feedback, setFeedback] = useState('');

    // יצירת משתמש
    const handleCreateUser = async () => {
        if (!email || !password || !name) {
            setFeedback("יש למלא את כל השדות.");
            return;
        }
        if (password.length < 6) {
            setFeedback("הסיסמה חייבת להיות לפחות 6 תווים.");
            return;
        }
        
        setFeedback('');
        
        try {
            // 1. יצירת משתמש ב-Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const userId = userCredential.user.uid;
            
            // 2. יצירת פרופיל ב-Firestore
            await setDoc(doc(db, "artifacts", appId, "public", "data", "users", userId), {
                email: email,
                role: role,
                name: name,
                createdAt: serverTimestamp(),
                createdBy: currentUser.email
            });

            setFeedback(`✅ משתמש ${name} נוצר בהצלחה עם תפקיד ${role}.`);
            setEmail('');
            setPassword('');
            setName('');
            setRole(ROLES.STUDENT); 
        } catch (error) {
            console.error("Error creating user:", error);
            if (error.code === 'auth/email-already-in-use') {
                setFeedback("🛑 אימייל זה כבר רשום במערכת.");
            } else {
                setFeedback(`🛑 שגיאה ביצירת משתמש: ${error.message}`);
            }
        }
    };


    const handleDeleteUser = async (userToDelete) => {
        // מניעת מחיקה של המנהל הראשי הקבוע
        if (userToDelete.email === SUPER_ADMIN_EMAIL) {
            setFeedback('🛑 לא ניתן למחוק את משתמש המנהל הראשי הקבוע!');
            return;
        }

        // אזהרה: מחיקת משתמש ה-Auth שלו דורשת שימוש ב-Admin SDK.
        // מכיוון שאנחנו ב-Frontend, אנחנו רק מוחקים את פרופיל ה-Firestore.
        setFeedback(`⚠️ משתמש ${userToDelete.name} ימחק מ-Firestore. (יש למחוק ידנית מ-Firebase Auth).`);
        
        // מחיקת המשתמש מ-Firestore
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "users", userToDelete.id));
            setFeedback(`✅ פרופיל משתמש ${userToDelete.name} נמחק בהצלחה מ-Firestore.`);
        } catch (error) {
            setFeedback(`🛑 שגיאה במחיקת משתמש: ${error.message}`);
        }
    };

    return (
        <div className="space-y-10">
            <Card title="הוספת משתמש חדש" className="bg-indigo-50 border-indigo-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input type="text" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} className="p-3 border rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
                    <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 border rounded-xl focus:ring-indigo-500 focus:border-indigo-500" dir="ltr" />
                    <input type="password" placeholder="סיסמה (6+ תווים)" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 border rounded-xl focus:ring-indigo-500 focus:border-indigo-500" />
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="p-3 border rounded-xl focus:ring-indigo-500 focus:border-indigo-500">
                        <option value={ROLES.STUDENT}>תלמיד</option>
                        <option value={ROLES.TEACHER}>מורה</option>
                        <option value={ROLES.ADMIN}>מנהל</option>
                    </select>
                </div>
                <Button onClick={handleCreateUser} className="bg-indigo-600 hover:bg-indigo-700" disabled={!name || !email || !password}>
                    <Plus size={18} /> יצירת משתמש מאושר
                </Button>
                {feedback && <p className={`mt-4 text-sm font-bold p-3 rounded-lg ${feedback.startsWith('✅') ? 'text-green-700 bg-green-100 border border-green-300' : 'text-red-700 bg-red-100 border border-red-300'}`}>{feedback}</p>}
            </Card>

            <Card title="רשימת משתמשים פעילים">
                {/* הצגת המנהל הראשי */}
                <h3 className="text-xl font-bold mt-6 mb-4 text-indigo-700">מנהל ראשי ({SUPER_ADMIN_EMAIL}) <span className='text-red-500 text-sm'>(בלתי ניתן למחיקה)</span></h3>
                <UserList users={[{ id: 'fixed', email: SUPER_ADMIN_EMAIL, name: 'המנהל הקבוע', role: ROLES.ADMIN }]} onDelete={handleDeleteUser} superAdminEmail={SUPER_ADMIN_EMAIL} />
                
                <h3 className="text-xl font-bold mt-8 mb-4 text-indigo-700">מורים ({teachers.length})</h3>
                <UserList users={teachers.filter(t => t.role === ROLES.TEACHER)} onDelete={handleDeleteUser} superAdminEmail={SUPER_ADMIN_EMAIL} />
                
                <h3 className="text-xl font-bold mt-8 mb-4 text-indigo-700">תלמידים ({students.length})</h3>
                <UserList users={students.filter(s => s.role === ROLES.STUDENT)} onDelete={handleDeleteUser} superAdminEmail={SUPER_ADMIN_EMAIL} />
            </Card>
        </div>
    );
};

const UserList = ({ users, onDelete, superAdminEmail }) => (
    <ul className="space-y-3">
        {users.map(user => (
            <li key={user.id} className={`flex justify-between items-center p-4 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md ${user.email === superAdminEmail ? 'bg-yellow-100' : 'bg-gray-50'}`}>
                <div className="flex flex-col text-right">
                    <p className="font-semibold text-gray-800">{user.name}</p>
                    <p className="text-sm text-gray-500" dir="ltr">({user.email})</p>
                </div>
                <div className='flex items-center space-x-4'>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full 
                        ${user.role === ROLES.ADMIN ? 'bg-red-200 text-red-800' : 
                          user.role === ROLES.TEACHER ? 'bg-blue-200 text-blue-800' : 
                          'bg-green-200 text-green-800'
                        }`}
                    >
                        {user.role === ROLES.ADMIN ? 'מנהל' : user.role === ROLES.TEACHER ? 'מורה' : 'תלמיד'}
                    </span>
                    <button 
                        onClick={() => onDelete(user)} 
                        className={`text-white p-2 rounded-full transition duration-200 shadow-md ${user.email === superAdminEmail ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}
                        disabled={user.email === superAdminEmail}
                        title={user.email === superAdminEmail ? 'לא ניתן למחוק את המנהל הראשי' : 'מחק משתמש'}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </li>
        ))}
    </ul>
);


const AdminClassesView = ({ teachers, students, classes, appId, db }) => (
    <Card title="ניהול כיתות">
        <p className="text-gray-600">הלוגיקה ליצירה וניהול כיתות (קישור מורים ותלמידים) תפותח בשלב הבא.</p>
    </Card>
);

export default App;
