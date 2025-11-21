import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import './App.css';
import './index.css';

// 1. הגדרות Firebase שלך
const firebaseConfig = {
  // החלף בפרטים האמיתיים שלך
  apiKey: "YOUR_API_KEY", 
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// משתנה ID ייחודי לאפליקציה
const appId = "pirhei-aharon-app";

function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [superAdminPassword, setSuperAdminPassword] = useState('');
  const [registrationComplete, setRegistrationComplete] = useState(false);
  
  // --- סטייטים להצגת נתונים ---
  const [appData, setAppData] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);


  // 1. בדיקת סטטוס אימות המשתמש הנוכחי
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // המשתמש מחובר ב-Firebase Auth
        const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCurrentUser({ uid: user.uid, role: userData.role });
        } else {
          // המשתמש נמצא ב-Auth אך אין לו נתונים ב-Firestore
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


  // 2. בדיקה האם קיים Super Admin במערכת
  useEffect(() => {
    const checkSuperAdmin = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, "artifacts", appId, "public", "data", "users"), where("role", "==", "admin"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // אם אין משתמשי אדמין, פותחים את מסך ההרשמה של סופר אדמין
          setRegistrationComplete(false);
        } else {
          setRegistrationComplete(true);
        }
      } catch (error) {
        console.error("Error checking super admin:", error);
      }
      setLoading(false);
    };

    if (!currentUser) {
        checkSuperAdmin();
    }
  }, [currentUser]);


  // 3. לוגיקת יצירת Super Admin
  const handleSuperAdminRegister = async () => {
    if (superAdminPassword.length < 6) {
        alert("הסיסמה חייבת להיות לפחות 6 תווים.");
        return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, superAdminEmail, superAdminPassword);
      
      // יצירת מסמך המשתמש ב-Firestore
      await setDoc(doc(db, "artifacts", appId, "public", "data", "users", userCredential.user.uid), {
        email: superAdminEmail,
        role: 'admin',
        createdAt: new Date()
      });

      setCurrentUser({ uid: userCredential.user.uid, role: 'admin' });
      setRegistrationComplete(true);
      setLoginMessage('ההרשמה וההתחברות הצליחו!');

    } catch (error) {
      console.error("🛑 Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("אימייל זה כבר קיים. אנא נסה להתחבר במקום להירשם.");
      } else {
        alert(`שגיאת הרשמה: ${error.message}`);
      }
    }
  };


  // 4. לוגיקת ההתחברות
  const handleLogin = async () => {
    // 🛑 שלב 1: DEBUG - בדיקת הנתונים לפני השליחה
    console.log('--- DEBUG: Attempting Login ---');
    console.log('Email:', loginEmail);
    console.log('Password:', loginPassword);
    console.log('-------------------------------');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      
      const userDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "users", userCredential.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // 🚀 SUCCESS LOG
        console.log('✅ Login Successful! User Role:', userData.role);

        setCurrentUser({ uid: userCredential.user.uid, role: userData.role });
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
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginMessage('אימייל או סיסמה שגויים');
      } else {
        setLoginMessage(`שגיאת התחברות בלתי צפויה: ${error.message}`);
      }
      setCurrentUser(null);
    }
  };


  // 5. לוגיקת יציאה (Logout)
  const handleLogout = () => {
    signOut(auth);
    setCurrentUser(null);
    setLoginMessage('התנתקת בהצלחה.');
  };


  // 6. טעינת נתונים לאחר התחברות
  useEffect(() => {
    if (currentUser) {
      // כאן היית טוען את נתוני האפליקציה לפי תפקיד המשתמש
      // ... הוסף כאן קוד לטעינת נתונים מ-Firestore
      // למטרות דיבוג:
      console.log(`User logged in as: ${currentUser.role}`);
      setAppData(`Dashboard Data for ${currentUser.role}`);
    } else {
        setAppData(null);
    }
  }, [currentUser]);


  // 7. רכיבי Render

  if (loading) {
    return <div className="text-center p-8">טוען...</div>;
  }

  // מסך 1: הרשמת Super Admin ראשונה
  if (!registrationComplete) {
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
          <button
            onClick={handleSuperAdminRegister}
            className="w-full bg-indigo-600 text-white p-3 rounded-lg hover:bg-indigo-700 transition duration-200"
          >
            הרשם והתחבר
          </button>
          {loginMessage && <p className="mt-4 text-sm text-red-500">{loginMessage}</p>}
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
          <button
            onClick={handleLogin}
            className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition duration-200"
          >
            התחבר
          </button>
          {loginMessage && <p className="mt-4 text-sm text-red-500 font-bold">{loginMessage}</p>}
        </div>
      </div>
    );
  }

  // מסך 3: דאשבורד (Dashboard) לאחר התחברות
  return (
    <div className="p-8 bg-white min-h-screen">
      <header className="flex justify-between items-center pb-4 border-b">
        <h1 className="text-3xl font-bold text-blue-700">דאשבורד</h1>
        <div className="flex items-center space-x-4">
          <span className="text-lg text-gray-700">מחובר כ: {currentUser.role} ({currentUser.uid.substring(0, 6)}...)</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-200"
          >
            התנתק
          </button>
        </div>
      </header>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">נתוני מערכת</h2>
        <p className="text-gray-600">{appData}</p>
        
        {/* ... כאן היית מוסיף את הצגת נתוני המורה/כיתה/מנהל ... */}
        {/* לדוגמה: <AdminView /> או <TeacherView data={teachers} /> */}
      </div>
    </div>
  );
}

export default App;
