Util.Diff = {

    diffStr : function( a , b ){
        return javaStatic( "ed.util.DiffUtil" , "computeDiff" , a , b );
    } ,

    applyBackwardsStr : function( base , diff ){
        return javaStatic( "ed.util.DiffUtil" , "applyScript" , base , diff );
    } ,

    // diff(3, 5) -> 2
    // applyBackwards(5, 2) -> 3

    diffInt : function( a , b ){
        return b-a;
    } ,

    applyBackwardsInt : function( base, diff ){
        return base-diff;
    } ,

    // diffDate takes Date, Date -> number
    diffDate : function( a , b ){
        return b.getTime() - a.getTime();
    },

    // applyBackwardsDate takes Date, number -> Date
    applyBackwardsDate : function( base, diff ){
        return new Date(base.getTime() - diff);
    },

    test : function(){
        var a = "1\n2";
        var b = "1\n3";

        var d = Util.Diff.diffStr( a , b );
        var n = Util.Diff.applyBackwardsStr( b , d );

        assert( a == n );

        var a = 3;
        var b = 5;
        var d = Util.Diff.diffInt( a , b );
        var n = Util.Diff.applyBackwardsInt( b , d );

        assert( a == n );

        var a = new Date( 2008, 01, 03, 7, 30, 0, 0 );
        var b = new Date( 2008, 01, 04, 7, 30, 0, 0 );
        var d = Util.Diff.diffDate( a , b );
        var n = Util.Diff.applyBackwardsDate( b, d );

        assert( a == n );

        return true;
    },

    diffArray : function( a , b ){
        // This is really hard!
        // OK, start with the simplest cases:
        // An array of a strings vs another array of strings.
        // We can't just join the strings with newlines and pass it to the
        // underlying string method..
        // In this case we should probably expose more of the underlying bmsi diff
        // code. Pass the arrays of strings "a", "b", "d" and "a", "b", "c", "d"
        // and hope it does the right thing -- try to insert a c.
        // I'm concerned that it always pick the "smallest" when it comes to
        // inserting elements.
        // An array of ints could be tricky too, especially when it comes to insert
        // them.
        // Arrays of objects are really hairy. I guess maybe come up with a
        // "distance" metric? I'd really have to look at the actual diff code

        // For now, throw an exception and hope it never happens.
        throw new Exception("diff on array not supported");
    },

    applyBackwardsArray : function( base , diff ){
        throw new Exception("how did you get a diff on an array??");
    },

    // Note: these functions are totally incomplete

    diffObj : function( a , b ){
        var d = {};
        for(var prop in a){
            if(! (prop in b) ){
                // mark it as removed
                d[prop] = {remove: a[prop]};
            }

            if(typeof a[prop] == "number" && typeof b[prop] == "number"){
                d[prop] = {change: Util.Diff.diffInt(a[prop], b[prop])};
            }
            else if(typeof a[prop] == "string" && typeof b[prop] == "string"){
                d[prop] = {change: Util.Diff.diffStr(a[prop], b[prop])};
            }
            else if(a[prop] instanceof Array && b[prop] instanceof Array){
                d[prop] = {change: Util.Diff.diffArray(a[prop], b[prop])};
            }
            else if(a[prop] instanceof Object && b[prop] instanceof Object){
                d[prop] = {change: Util.Diff.diffObj(a[prop], b[prop])};
            }
            else {
                log.diff.warning("property " + prop + " is of different types in the two objects");
                d[prop] = {remove: a[prop], add: b[prop]};
            }
        }
        for(var prop in b){
            if(! (prop in a) ){
                // add it
                d[prop] = {add: b[prop]};
            }
        }
        return d;
    },

    applyBackwardsObj : function( base , diff ){
        var res = {};
        for(var prop in base){
            res[prop] = base[prop];
        }
        for(var prop in diff){
            var d = diff[prop];
            if(d.add){
                // apply backwards, i.e. delete it
                delete res[prop];
            }
            if(d.remove){
                // apply backwards, i.e. add it
                res[prop] = d.remove;
            }
            if(d.change){
                if(typeof base[prop] == "number"){
                    res[prop] = Util.Diff.applyBackwardsInt(base[prop], diff[prop].change);
                }
                else if(typeof base[prop] == "string"){
                    res[prop] = Util.Diff.applyBackwardsStr(base[prop], diff[prop].change);
                }
                else{
                    throw new Exception("not implemented, leave me alone");
                }

            }
        }
        return res;
    },

    diff : function(a, b){
        return Util.Diff.diffObj({arg: a}, {arg: b})["arg"].change;
    },

    applyBackwards : function(base, diff){
        return Util.Diff.applyBackwardsObj({arg: base}, {arg: {change: diff}})["arg"];
    }

};
