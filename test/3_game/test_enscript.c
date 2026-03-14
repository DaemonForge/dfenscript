
typedef map<string, string> testMapType;
testMapType testMap;


        typedef Param5<string, int, bool, DayZPlayerImplement, string> testParamType;

map<string, int> testMap2;


enum testEnum {
    test1,
    test2,
    test3
};


enum testEnum2 {
    test1 = 1,
    test2 = 2;//Should flag enum with semicolon
    test3
};

class test {
    string a;
    int b;
    bool c;
    //Should flag type not in 3_game
    DayZPlayerImplement dp;
    TIntArray intArray = {1,2,3,4,5};

    int testint1, testint2;



    //Should flag unknown class
    NotARealClass NotARealClass;




    void Test1(string e, int f, bool g = true) {
        a = e;
        //should flag type mismatch
        a = b;



        int testint3, testint4, testint5;

        int  testint1 = 1; //should flag for duplicate variable name from class variable
        testint2 = 2;
        testint3 = 3;
        testint4 = 4;
        testint5 = 5;
        testint6 = 6; //Should flag undeclared variable

        testInt(testint1, testint2, testint3);
        testInt(testint4, testint6, testint7);//Should flag undeclared variables

        b = a; //Should flag type mismatch

        PlayerBase p;//Should flag class from 4_world and not in 3_game
        ManBase m; //Should flag class from 4_world and not in 3_game

        PlayerBase.AbortWeaponEvent();//should flag static function call on class from 4_world and not in 3_game

        PlayerBase p2 = new PlayerBase();//should flag new on class from 4_world and not in 3_game

        bool isPlayer = Class.CastTo(p, m);
        
        int y = isPlayer ? 1 : 0; //Should flag ternary operator with non-matching types

        p = m;//should flag for down castinging without cast
        m = p;
        
        
        
        Barrel_ColorBase barrel; //Should flag class from 4_world and not in 3_game




        p = barrel; //should flag for incompatible types

        string tests1 = "test" + a + b //should flag for multi line string concatenation not valid in Enscript
            + "string";

        string tests2 = "test" + a + b + //should flag for multi line string concatenation not valid in Enscript
                "string" + e + f + g; 





        int testValue2 = testMap.Get("test2"); //Should flag type mismatch on map get






        string testValue = testMap.Get("test"  + "1") ; //should not flag
        


        for(int i = 0; i < 10; i++)
        {
            testMap.Get("test" + i);
        }
        for(int i = 0; i < 10; i++) //should flag for duplicate loop variable
        {
            testMap2.Get("test" + i);
        }
      

        testParamType testp;





        typedef Param5<string, int, bool, DayZPlayerImplement, string> testParamType;




        string i = testp.param4.GetHumanInventory().GetEntityInHands().GetPosition(); //Should flag for invalid assignment of vector to string




        p.AfterStoreLoad()


        DayZPlayerImplement dzp; //should flag for class from 4_world and not in 3_game


        dzp = testp.param4;
        Object o;
        e = testMap2.Get("string");
        f = testMap2.Get("string");


        test2 t2;
        t2.testint1 = 1; //Should not flag as testint1 is public
        t2.testint2 = 1; //Should flag for protected variable access
        t2.testint3 = 1; //Should flag for private variable access
        t2.Test2Public();
        t2.TestProtected(); //Should flag for protected function access
        t2.TestPrivate(); //Should flag for private function access

        string teststr = "test";
        string teststr2 = "test";
        string teststr3 = "test";

        bool tb1 = t2.TestFunction(teststr, teststr2, teststr3);

        bool tb2 = t2.TestModdedFunction(teststr, teststr2, teststr3); // should not flag as a missing function
        
    }

    void Test3(string e, string f) {

    }

    void Test4(string e, string f){}

    PlayerBase TestPlayerBase(){ //should flag for return type of class from 4_world and not in 3_game
        ManBase m; //Should flag class from 4_world and not in 3_game
        return m;//Should warn about un safe downcast from ManBase to PlayerBase
    }


    void Test5(string e, string f)
    {

    }

    void testInt(int i1, int i2, int i3){

    }

    void Test2() {
        Test1(1,2,true); //Should flag type mismatch on first parameter






        Test1("string", 2, "false"); //Should flag type mismatch on third parameter

        Test1("string", 2);
        Test1("string", 
            b, 
            false);
        
    }

}

class testin extends test {

    string b; //should flag as duplicate variable name from parent class

    void Test6(string a) { //should flag for parameter name that matches class variable

        Test1("string", 2, true);
        Test3("string", "string");
        Test4("string", "string");
        Test5("string", "string");
    }

    int Test7() {



        return "test"; //should flag for return type mismatch
    }
    




    override void Test3(string e2, string f) { //should flag for parameter name mismatch with parent class

    }






    void Test5(string e, string f){ //should flag for missing override keyword and parameter name mismatch with parent class

    }






    override void TestNonExistent(string e, string f){ // should flag for override of non-existent function in parent class

    }
    
}

modded class testin {
    override void Test3(string e2, string f) {

    }

    void Test5(string e, string f){ // shoudl flag for missing override keyword and parameter name mismatch with parent class

    }

    override void Test3(string e, string f) {

    }
    
    void TestModdedFunction(string e, string f){

    }
}

modded class testin {
    override void Test3(string e2, string f) {

    }

    void Test5(string e, string f){ //should flag for missing override keyword and parameter name mismatch with parent class

    }

    override void Test3(string e, string f) {

    }
    
    void TestModdedFunction(string e, string f){

    }


    void testModdedFunction2(PlayerBase p, string f){ //should flag for parameter of class from 4_world and not in 3_game

    }
}


class test2 {
    
    autoptr TIntArray intArray2 = {1,2,3,4,5};
    
    int testint1;
    protected int testint2;
    private int testint3;

    protected void TestProtected() {
    }

    void Test2Public() {
        
    }

    private void TestPrivate() {
    }

    bool TestFunction(string e, string f, string g) {
        Param3<string, string, string> testparam = new Param3<string, string, string>(e, f, g);
        return true;    
    }
}

modded class test2 {

    override void TestProtected() {

    }

    override void Test2Public() {
        TestPrivate(); //Should flag for private function
    }

    //should flag can't override private function from parent class
    override void TestPrivate() {

    }   

    bool TestModdedFunction(string e, string f, string g) {
        Param3<string, string, string> testparam = new Param3<string, string, string>(e, f, g);
        return true;    
    }
}

class test3 extends test2 {

    void Test() {
        Test2Public();
        TestProtected();  //should not flagged as protected functions are accessible in child classes
        TestPrivate(); //Should flag for private function access
        testint2 = 1; //Should not flag as protected variables are accessible in child classes
        testint3 = 1; //Should flag for private variable access
    }
}
/*
*/