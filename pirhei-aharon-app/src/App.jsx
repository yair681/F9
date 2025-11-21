import React, { useState, useEffect } from 'react';
// ייבוא השירותים (auth, db) מהקובץ החדש שיצרנו
import { auth, db, APP_ID_CUSTOM } from './firebaseConfig'; 

import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  setDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  LogOut, 
  Plus
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

// רכיב כפתור רגיל (Custom Button)
const Button = ({ children, onClick, className = '', disabled = false, type = 'button' }) => (
    <button
        onClick={onClick}
        className={`flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-semibold transition duration-200 ${
            disabled 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
        } ${className}`}
        disabled={disabled}
        type={type}
    >
        {children}
    </button>
);

// רכיב כרטיס (Card)
const Card = ({ title, children, className = '' }) => (
    <div className={`p-6 bg-white shadow-xl rounded-lg ${className}`}>
        <h2 className="text-2xl font-bold mb-4 border-b pb-2 text-indigo-700">{title}</h2>
        {children}
    </div>
);


function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(true); // משתנה זה יקבע אם יש Admin רשום
  
  // --- סטייטים לנתוני האפליקציה ---
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [view, setView] = useState('dashboard'); // ניווט פנימי


  // 1. בדיקת סטטוס אימות המשתמש הנוכחי
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // המשתמש מחובר ב-Firebase Auth
        const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({ uid: user.uid, role: userData.role, email: userData.email, name: userData.name });
        } else {
          // המשתמש נמצא ב-Auth אך אין לו נתונים ב-Firestore (כנראה נמחק)
          await signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);


  // 2. בדיקה האם קיים Super Admin במערכת (לצורך ניווט)
  useEffect(() => {
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
        console.error("Error checking super admin:", error);
      }
    };

    if (!currentUser && loading === false) {
        checkSuperAdmin();
    }
  }, [currentUser, loading]);


  // 3. לוגיקת יצירת Super Admin (הרשמה ראשונית)
  const handleSuperAdminRegister = async () => {
    if (superAdminPassword.length < 6) {
        setLoginMessage("הסיסמה חייבת להיות לפחות 6 תווים.");
        return;
    }
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, superAdminEmail, superAdminPassword); // שימוש בסיסמה זמנית, ניתן להשתמש גם ב-createUserWithEmailAndPassword

      // יצירת מסמך המשתמש ב-Firestore
      await setDoc(doc(db, "artifacts", appId, "public", "data", "users", userCredential.user.uid), {
        email: superAdminEmail,
        role: ROLES.ADMIN,
        name: 'מנהל ראשי', // שם ברירת מחדל
        createdAt: new Date()
      });

      setCurrentUser({ uid: userCredential.user.uid, role: ROLES.ADMIN, email: superAdminEmail, name: 'מנהל ראשי' });
      setRegistrationComplete(true);
      setLoginMessage('ההרשמה וההתחברות הצליחו!');

    } catch (error) {
      console.error("🛑 Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginMessage("אימייל זה כבר קיים. אנא נסה להתחבר במקום להירשם.");
      } else {
        setLoginMessage(`שגיאת הרשמה: ${error.message}`);
      }
    } finally {
        setLoading(false);
    }
  };


  // 4. לוגיקת ההתחברות
  const handleLogin = async () => {
    // 🛑 שלב 1: DEBUG - בדיקת הנתונים לפני השליחה
    console.log('--- DEBUG: Attempting Login ---');
    console.log('Email:', loginEmail);
    console.log('Password:', loginPassword);
    console.log('-------------------------------');
    
    setLoginMessage('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      
      const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // 🚀 SUCCESS LOG
        console.log('✅ Login Successful! User Role:', userData.role);

        setCurrentUser({ uid: userCredential.user.uid, role: userData.role, email: userData.email, name: userData.name });
        setLoginMessage('');
      } else {
        // אם המשתמש נמצא ב-Authentication אך לא ב-Firestore
        setLoginMessage("משתמש אותנטי אך נתונים חסרים (כנראה נמחק)."); 
        signOut(auth);
      }
    } catch (error) {
      // 🛑 שלב 2: DEBUG - הצגת קוד השגיאה המדויק
      console.error('🛑 FIREBASE LOGIN ERROR CODE:', error.code);
      console.error('🛑 FIREBASE LOGIN ERROR MESSAGE:', error.message);
      
      // בדיקת שגיאות נפוצות
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginMessage('אימייל או סיסמה שגויים');
      } else if (error.code === 'auth/api-key-not-valid') {
        setLoginMessage('שגיאת מפתח API. בדוק את הגדרות Firebase בקובץ firebaseConfig.js');
      } else {
        setLoginMessage(`שגיאת התחברות בלתי צפויה: ${error.message}`);
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
    setLoginMessage('התנתקת בהצלחה.');
    setView('dashboard'); // חזור למסך הראשי לאחר יציאה
  };


  // 6. טעינת נתונים (לצורך הדגמה)
  useEffect(() => {
    // טעינת מורים ותלמידים מ-Firestore עם onSnapshot
    if (currentUser) {
        const qTeachers = query(collection(db, "artifacts", appId, "public", "data", "users"), where("role", "==", ROLES.TEACHER));
        const qStudents = query(collection(db, "artifacts", appId, "public", "data", "users"), where("role", "==", ROLES.STUDENT));
        
        const unsubscribeTeachers = onSnapshot(qTeachers, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeachers(list);
        });

        const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(list);
        });

        return () => {
            unsubscribeTeachers();
            unsubscribeStudents();
        };
    } else {
        setTeachers([]);
        setStudents([]);
    }
  }, [currentUser]);


  // 7. רכיבי Render

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="text-center p-8 bg-white shadow-lg rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-lg text-indigo-700">טוען נתונים...</p>
            </div>
        </div>
    );
  }

  // מסך 1: הרשמת Super Admin ראשונה
  if (!registrationComplete && !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white shadow-lg rounded-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600">הרשמת מנהל-על (Super Admin)</h2>
          <p className="mb-4 text-sm text-gray-600">זהו המשתמש הראשון במערכת. פרטיו ישמשו לניהול.</p>
          <input
            type="email"
            placeholder="אימייל מנהל"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={superAdminEmail}
            onChange={(e) => setSuperAdminEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="סיסמה (לפחות 6 תווים)"
            className="w-full p-3 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={superAdminPassword}
            onChange={(e) => setSuperAdminPassword(e.target.value)}
          />
          <Button
            onClick={handleSuperAdminRegister}
            className="w-full"
          >
            הרשם והתחבר
          </Button>
          {loginMessage && <p className="mt-4 text-sm text-red-500 font-bold">{loginMessage}</p>}
        </div>
      </div>
    );
  }

  // מסך 2: מסך התחברות
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="p-8 bg-white shadow-lg rounded-lg w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6 text-green-600">כניסה למערכת</h2>
          <input
            type="email"
            placeholder="אימייל"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="סיסמה"
            className="w-full p-3 mb-6 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
          />
          <Button
            onClick={handleLogin}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            התחבר
          </Button>
          {loginMessage && <p className="mt-4 text-sm text-red-500 font-bold">{loginMessage}</p>}
        </div>
      </div>
    );
  }

  // מסך 3: דאשבורד (Dashboard) לאחר התחברות
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* סרגל ניווט צדדי */}
      <nav className="w-64 bg-white shadow-lg p-6 flex flex-col items-center border-l">
        <div className="flex items-center space-x-2 mb-10 text-indigo-700">
            <Flower size={32} />
            <span className="text-2xl font-bold">פרחי אהרון</span>
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
            <NavItem icon={Users} label="הנתונים שלי" currentView={view} target="profile" setView={setView} />
        </div>

        {/* יציאה */}
        <div className="mt-auto w-full pt-6 border-t">
            <button
                onClick={handleLogout}
                className="flex items-center space-x-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition duration-200 font-semibold"
            >
                <LogOut size={20} />
                <span>התנתק</span>
            </button>
            <p className="mt-2 text-xs text-gray-400 text-center">מחובר כ: {currentUser.email} ({currentUser.uid.substring(0, 6)}...)</p>
        </div>
      </nav>

      {/* אזור תוכן ראשי */}
      <main className="flex-1 p-10">
        <header className="pb-6 border-b mb-8">
          <h1 className="text-4xl font-extrabold text-gray-800">
            {
                view === 'dashboard' ? 'דאשבורד ראשי' :
                view === 'users' ? 'ניהול משתמשים' :
                view === 'classes' ? 'ניהול כיתות' :
                view === 'profile' ? 'הפרופיל שלי' : 'עמוד לא נמצא'
            }
          </h1>
          <p className="text-gray-500 mt-1">
            ברוך הבא, {currentUser.role === ROLES.ADMIN ? 'מנהל' : currentUser.role === ROLES.TEACHER ? 'מורה' : 'תלמיד'}!
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
        className={`flex items-center space-x-3 w-full p-3 font-semibold rounded-lg transition duration-200 ${
            currentView === target
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
        }`}
        onClick={() => setView(target)}
    >
        <Icon size={20} />
        <span>{label}</span>
    </button>
);


// רכיבי View (לצורך הדגמה)
const DashboardView = ({ currentUser, teachers, students, classes }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="סה״כ מורים" className="bg-blue-50">
            <p className="text-4xl font-extrabold text-blue-700">{teachers.length}</p>
        </Card>
        <Card title="סה״כ תלמידים" className="bg-green-50">
            <p className="text-4xl font-extrabold text-green-700">{students.length}</p>
        </Card>
        <Card title="סה״כ כיתות" className="bg-yellow-50">
            <p className="text-4xl font-extrabold text-yellow-700">{classes.length}</p>
        </Card>
        <Card title={`ברוך הבא, ${currentUser.name}`} className="md:col-span-3">
            <p className="text-gray-600">זהו הדאשבורד הראשי של המערכת. התוכן יוצג כאן בהתאם לתפקידך ({currentUser.role}).</p>
        </Card>
    </div>
);

const AdminUsersView = ({ students, teachers, appId, db }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState(ROLES.STUDENT);
    const [feedback, setFeedback] = useState('');

    const handleCreateUser = async () => {
        if (!email || !password || !name) {
            setFeedback("יש למלא את כל השדות.");
            return;
        }
        if (password.length < 6) {
            setFeedback("הסיסמה חייבת להיות לפחות 6 תווים.");
            return;
        }
        
        // יצירת משתמש היא תהליך מורכב, לצורך הדוגמה נשתמש רק ב-Firestore
        // באפליקציה אמיתית, נרשום את המשתמש ב-Firebase Auth ( createUserWithEmailAndPassword )
        // ולאחר מכן נשמור את הנתונים הנוספים ב-Firestore.
        
        // --- פתרון זמני: בדיקת קיום משתמש ב-Auth לפני יצירה ---
        try {
            // ננסה להתחבר כדי לראות אם קיים משתמש עם אותו אימייל כבר ב-Auth
            await signInWithEmailAndPassword(auth, email, password);
            setFeedback("משתמש עם אימייל זה כבר קיים ב-Authentication.");
            return;
        } catch (authError) {
            // אם השגיאה היא user-not-found או wrong-password, נמשיך ליצירת משתמש ב-Firestore כפתרון זמני.
            // אם השגיאה היא auth/api-key-not-valid - יש בעיה בהגדרות.
        }
        
        // יצירת משתמש ב-Firestore (פתרון חלקי, דורש שימוש בפונקציה createUserWithEmailAndPassword)
        // לצורך הפשטות, אנו משתמשים ב-setDoc עם UID פיקטיבי, אך זה לא מומלץ.
        // נשתמש ב-Date.now() כ-UID זמני לצורך הדגמה, המשתמש לא יוכל להתחבר עד שיצור חשבון ב-Auth
        const tempUid = `temp-${Date.now()}`; 
        
        try {
            await setDoc(doc(db, "artifacts", appId, "public", "data", "users", tempUid), {
                email: email,
                role: role,
                name: name,
                createdAt: new Date(),
                // לא שומרים סיסמה ב-Firestore, זה רק למטרות הצגת נתונים.
            });
            setFeedback(`משתמש ${name} נוצר בהצלחה. שים לב: המשתמש צריך להירשם ב-Auth כדי להתחבר!`);
            setEmail('');
            setPassword('');
            setName('');
        } catch (firestoreError) {
            setFeedback(`שגיאה ביצירת משתמש ב-Firestore: ${firestoreError.message}`);
        }
    };


    const handleDeleteUser = async (userId) => {
        // מחיקת המשתמש מ-Firestore
        try {
            await deleteDoc(doc(db, "artifacts", appId, "public", "data", "users", userId));
            setFeedback(`משתמש ${userId.substring(0, 8)} נמחק בהצלחה.`);
        } catch (error) {
            setFeedback(`שגיאה במחיקת משתמש: ${error.message}`);
        }
        
        // הערה: מחיקה מ-Authentication צריכה להיעשות ב-Backend (cloud function) מטעמי אבטחה.
    };

    return (
        <div className="space-y-8">
            <Card title="הוספת משתמש חדש">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" placeholder="שם מלא" value={name} onChange={(e) => setName(e.target.value)} className="p-2 border rounded-lg" />
                    <input type="email" placeholder="אימייל" value={email} onChange={(e) => setEmail(e.target.value)} className="p-2 border rounded-lg" />
                    <input type="password" placeholder="סיסמה (6+)" value={password} onChange={(e) => setPassword(e.target.value)} className="p-2 border rounded-lg" />
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="p-2 border rounded-lg">
                        <option value={ROLES.STUDENT}>תלמיד</option>
                        <option value={ROLES.TEACHER}>מורה</option>
                    </select>
                </div>
                <Button onClick={handleCreateUser} className="mt-4">
                    <Plus size={18} /> יצירת משתמש
                </Button>
                {feedback && <p className="mt-4 text-sm text-red-500 font-bold">{feedback}</p>}
            </Card>

            <Card title="רשימת משתמשים פעילים">
                <h3 className="text-lg font-semibold mt-6 mb-3">מורים ({teachers.length})</h3>
                <UserList users={teachers} onDelete={handleDeleteUser} />
                
                <h3 className="text-lg font-semibold mt-6 mb-3">תלמידים ({students.length})</h3>
                <UserList users={students} onDelete={handleDeleteUser} />
            </Card>
        </div>
    );
};

const UserList = ({ users, onDelete }) => (
    <ul className="space-y-2">
        {users.map(user => (
            <li key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                <div>
                    <p className="font-semibold">{user.name} ({user.role})</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <Button 
                    onClick={() => onDelete(user.id)} 
                    className="bg-red-500 hover:bg-red-600 p-1.5"
                >
                    מחק
                </Button>
            </li>
        ))}
    </ul>
);


const AdminClassesView = ({ teachers, students, classes, appId, db }) => (
    <Card title="ניהול כיתות">
        <p>מקום לטופס יצירת כיתה ולרשימת כיתות. לוגיקת הכיתות תגיע בשלב הבא.</p>
    </Card>
);

export default App;
