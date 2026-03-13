
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

        testint1 = 1;
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
/*
*/