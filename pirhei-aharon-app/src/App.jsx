import React, { useState, useEffect } from 'react';
// ייבוא השירותים (auth, db) מהקובץ החדש שיצרנו
import { auth, db, APP_ID_CUSTOM } from './firebaseConfig'; 

import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword // **חובה** ליצירת משתמשים חדשים ב-Auth
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  setDoc,
  deleteDoc, 
  onSnapshot
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
  Zap
} from 'lucide-react';
import './App.css';
import './index.css';


// נשתמש ב-APP_ID_CUSTOM במקום המשתנה המקומי
const appId = APP_ID_CUSTOM;

// הגדרות תפקידים (Roles)
const ROLES = {
    ADMIN: 'admin',
    TEACHER: 'teacher',
    STUDENT: 'student',
};

// רכיב כפתור רגיל עם עיצוב משופר
const Button = ({ children, onClick, className = '', disabled = false, type = 'button' }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center space-x-2 py-2 px-6 rounded-xl font-bold transition duration-300 ease-in-out transform hover:scale-[1.01] shadow-md hover:shadow-lg ${
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


function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState(''); 
  const [loginPassword, setLoginPassword] = useState(''); 
  const [loginMessage, setLoginMessage] = useState('');
  const [superAdminEmail, setSuperAdminEmail] = useState('yairfrish2@gmail.com'); // **הגדרת ברירת המחדל המבוקשת**
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(null); 
  
  // --- סטייטים לנתוני האפליקציה ---
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [view, setView] = useState('dashboard'); 
  const [authReady, setAuthReady] = useState(false); 


  // 1. בדיקת סטטוס אימות המשתמש הנוכחי
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
            const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // אם המשתמש מחובר ונתונים קיימים, טען אותו
                setCurrentUser({ uid: user.uid, role: userData.role, email: userData.email, name: userData.name });
            } else {
                // המשתמש מחובר ב-Auth, אבל חסר פרופיל Firestore.
                // זהו משתמש "לא מאושר" (לא נוצר על ידי אדמין) או פרופיל שנמחק בטעות.
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
        setCurrentUser(null);
      }
      setAuthReady(true);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  // 2. בדיקה האם קיים Super Admin במערכת (לצורך ניווט)
  useEffect(() => {
    if (authReady && !currentUser) { 
        const checkSuperAdmin = async () => {
          try {
            const q = query(collection(db, "artifacts", appId, "public", "data", "users"), where("role", "==", ROLES.ADMIN));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
              setRegistrationComplete(false); // אין אדמין, פתח הרשמה
            } else {
              setRegistrationComplete(true); // יש אדמין, הצג לוגין
            }
          } catch (error) {
            console.error("Error checking super admin. Assuming registration is complete.", error);
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
    if (superAdminPassword.length < 6) {
        setLoginMessage("הסיסמה חייבת להיות לפחות 6 תווים.");
        return;
    }
    setLoading(true);

    try {
      // יצירת המשתמש ב-Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, superAdminEmail, superAdminPassword); 

      // יצירת מסמך המשתמש ב-Firestore עם תפקיד ADMIN
      await setDoc(doc(db, "artifacts", appId, "public", "data", "users", userCredential.user.uid), {
        email: superAdminEmail,
        role: ROLES.ADMIN,
        name: 'מנהל ראשי', 
        createdAt: new Date()
      });

      setCurrentUser({ uid: userCredential.user.uid, role: ROLES.ADMIN, email: superAdminEmail, name: 'מנהל ראשי' });
      setRegistrationComplete(true);
      setLoginMessage('ההרשמה וההתחברות הצליחו!');

    } catch (error) {
      console.error("🛑 Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginMessage("אימייל זה כבר קיים. אנא נסה להתחבר במקום להירשם.");
      } else if (error.code === 'auth/weak-password') {
        setLoginMessage("סיסמה חלשה מדי. אנא השתמש בסיסמה של לפחות 6 תווים.");
      } else {
        setLoginMessage(`שגיאת הרשמה: ${error.message}`);
      }
    } finally {
        setLoading(false);
    }
  };


  // 4. לוגיקת ההתחברות
  const handleLogin = async () => {
    if (!loginEmail.includes('@') || loginPassword.length < 6) {
        setLoginMessage('אנא הזן כתובת אימייל מלאה וסיסמה חוקית (6+ תווים).');
        setLoginPassword('');
        return;
    }
    
    setLoginMessage('');
    setLoading(true);

    try {
      // שלב 1: אימות ב-Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const userId = userCredential.user.uid;
      
      // שלב 2: בדיקת פרופיל Firestore (בדיקת "מאושר" על ידי מנהל)
      const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // הצלחה: המשתמש קיים ב-Auth וקיים לו פרופיל ב-Firestore (נוצר על ידי מנהל או בהרשמה הראשונית)
        setCurrentUser({ uid: userId, role: userData.role, email: userData.email, name: userData.name });
        setLoginMessage('');
      } else {
        // כישלון אבטחה: המשתמש קיים ב-Auth (הצליח להתחבר), אך אין לו פרופיל ב-Firestore.
        // זה אומר שהוא נרשם בדרך עקיפה ולא אושר על ידי מנהל.
        console.warn(`⚠️ Security Breach: User ${userId} logged in via Auth but missing Firestore profile. Logging out.`);
        await signOut(auth);
        setLoginMessage('שגיאת אבטחה: משתמש זה אינו מאושר על ידי מנהל המערכת. פנה למנהל.');
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('🛑 FIREBASE LOGIN ERROR CODE:', error.code);
      
      setLoginPassword(''); 

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginMessage('אימייל או סיסמה שגויים. **וודא שהזנת כתובת אימייל מלאה!**');
      } else {
        setLoginMessage(`שגיאת התחברות: ${error.message}`);
      }
      setCurrentUser(null);
    } finally {
        setLoading(false);
    }
  };


  // 5. לוגיקת יציאה (Logout)
  const handleLogout = () => {
    signOut(auth);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setLoginMessage('התנתקת בהצלחה.');
    setView('dashboard'); 
  };


  // 6. טעינת נתונים
  useEffect(() => {
    // טעינת מורים ותלמידים מ-Firestore עם onSnapshot
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
  }, [currentUser]);


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
          <p className="mb-6 text-md text-gray-600">
             זהו המשתמש הראשון במערכת. אנא השתמש ב**כתובת אימייל מלאה** ובסיסמה חזקה.
          </p>
          <input
            type="email"
            placeholder="אימייל מנהל (לדוגמה: yairfrish2@gmail.com)"
            className="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-100 text-left"
            value={superAdminEmail}
            onChange={(e) => setSuperAdminEmail(e.target.value)}
            dir="ltr"
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
          {loginMessage && <p className="mt-5 text-sm text-red-500 font-bold bg-red-50 p-3 rounded-lg border border-red-300">{loginMessage}</p>}
        </div>
      </div>
    );
  }

  // מסך 2: מסך התחברות
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 bg-gradient-to-br from-green-50 to-white">
        <div className="p-10 bg-white shadow-2xl rounded-2xl w-full max-w-lg text-center border-t-4 border-green-600">
          <h2 className="text-3xl font-extrabold mb-8 text-green-800 flex items-center justify-center space-x-3">
            <Lock size={28}/> כניסה למערכת
          </h2>
          
          <p className="mb-6 text-sm text-gray-600 p-2 bg-blue-50 rounded-lg border border-blue-200">
            רק משתמשים שנוצרו על ידי מנהל רשאים להיכנס.
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
          {loginMessage && <p className="mt-5 text-sm text-red-500 font-bold bg-red-50 p-3 rounded-lg border border-red-300">{loginMessage}</p>}
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
                className="flex items-center space-x-3 w-full p-3 font-semibold rounded-xl transition duration-200 text-red-600 hover:bg-red-50 hover:shadow-inner"
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
                view === 'profile' ? 'הפרופיל שלי' : 'עמוד לא נמצא'
            }
          </h1>
          <p className="text-gray-500 mt-2 text-lg">
            ברוך הבא, {currentUser.name || currentUser.email}! 
          </p>
        </header>

        {/* תוכן לפי View */}
        {view === 'dashboard' && <DashboardView currentUser={currentUser} teachers={teachers} students={students} classes={classes} />}
        {view === 'users' && currentUser.role === ROLES.ADMIN && <AdminUsersView students={students} teachers={teachers} appId={appId} db={db} />}
        {view === 'classes' && currentUser.role === ROLES.ADMIN && <AdminClassesView teachers={teachers} students={students} classes={classes} appId={appId} db={db} />}
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


// רכיבי View (לצורך הדגמה)
const DashboardView = ({ currentUser, teachers, students, classes }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card title="סה״כ מורים" className="bg-blue-50 border-blue-200">
            <p className="text-5xl font-black text-blue-700">{teachers.length}</p>
        </Card>
        <Card title="סה״כ תלמידים" className="bg-green-50 border-green-200">
            <p className="text-5xl font-black text-green-700">{students.length}</p>
        </Card>
        <Card title="סה״כ כיתות" className="bg-yellow-50 border-yellow-200">
            <p className="text-5xl font-black text-yellow-700">{classes.length}</p>
        </Card>
        <Card title={`שלום, ${currentUser.name || 'משתמש'}`} className="md:col-span-3 bg-gray-50">
            <p className="text-gray-600">
                זהו הדאשבורד הראשי של המערכת. התפקיד שלך: 
                <span className="font-bold text-indigo-600 mr-1">{currentUser.role === ROLES.ADMIN ? 'מנהל' : currentUser.role === ROLES.TEACHER ? 'מורה' : 'תלמיד'}</span>
            </p>
        </Card>
    </div>
);

const AdminUsersView = ({ students, teachers, appId, db }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState(ROLES.STUDENT);
    const [feedback, setFeedback] = useState('');

    // **פונקציה מתוקנת ליצירת משתמש**
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
            
            // 2. יצירת פרופיל ב-Firestore עם התפקיד המבוקש
            await setDoc(doc(db, "artifacts", appId, "public", "data", "users", userId), {
                email: email,
                role: role,
                name: name,
                createdAt: new Date(),
            });

            setFeedback(`✅ משתמש ${name} נוצר בהצלחה עם תפקיד ${role}.`);
            setEmail('');
            setPassword('');
            setName('');
            setRole(ROLES.STUDENT); // איפוס
        } catch (error) {
            console.error("Error creating user:", error);
            if (error.code === 'auth/email-already-in-use') {
                setFeedback("🛑 אימייל זה כבר רשום במערכת.");
            } else {
                setFeedback(`🛑 שגיאה ביצירת משתמש: ${error.message}`);
            }
        }
    };


    const handleDeleteUser = async (userId) => {
        setFeedback('במערכת מלאה, היינו צריכים למחוק גם את משתמש ה-Auth שלו. כאן, נמחוק רק את פרופיל ה-Firestore. אנא היכנס למסך ה-Auth כדי למחוק את המשתמש לצמיתות.');
        // מחיקת המשתמש מ-Firestore
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "users", userId));
            setFeedback(`✅ פרופיל משתמש ${userId.substring(0, 8)} נמחק בהצלחה מ-Firestore.`);
        } catch (error) {
            setFeedback(`🛑 שגיאה במחיקת משתמש: ${error.message}`);
        }
    };

    return (
        <div className="space-y-10">
            <Card title="הוספת משתמש חדש" className="bg-indigo-50 border-indigo-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input type="text" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} className="p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} className="p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" dir="ltr" />
                    <input type="password" placeholder="סיסמה (6+ תווים)" value={password} onChange={(e) => setPassword(e.target.value)} className="p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="p-3 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
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
                <h3 className="text-xl font-bold mt-6 mb-4 text-indigo-700">מורים ({teachers.length})</h3>
                <UserList users={teachers} onDelete={handleDeleteUser} />
                
                <h3 className="text-xl font-bold mt-8 mb-4 text-indigo-700">תלמידים ({students.length})</h3>
                <UserList users={students} onDelete={handleDeleteUser} />
            </Card>
        </div>
    );
};

const UserList = ({ users, onDelete }) => (
    <ul className="space-y-3">
        {users.map(user => (
            <li key={user.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border border-gray-200 shadow-sm transition hover:shadow-md">
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
                        onClick={() => onDelete(user.id)} 
                        className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition duration-200 shadow-md"
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
