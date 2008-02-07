/* 
   e.g.:

   xml.to( print, "myobjtype", { name: "foo", x : 3 } );

   <myobjtype>
     <name>foo</name>
     <x>3</x>
   </myobjtype>

*/

xml = {

    toString : function( name , obj ){
        var s = "";
        xml.to( function( z ){ s += z; } , name , obj );
        return s;
    } ,
    
    to : function( append , name , obj , indent ){

        if ( ! indent ) indent = 0;
        
        if ( ! name )
            name = obj._name;

        var newLine = false;
        
        if ( name ){
            xml._indent( append , indent );        
            append( "<" + name  );
            if ( isObject( obj ) && isObject( obj._props ) ){
                for ( var a in obj._props ){
                    append( " " + a + "=\"" + obj._props[a] + "\" " );
                }
            }

            if ( obj == null ){
                append( " />" );
                return;
            }

            append( ">" );
        }
        
        if ( obj == null ){
        }
        else if ( isString( obj ) || isDate( obj ) ){
            append( obj );
        }
        else if ( isObject( obj ) ){
            
            newLine = true;
            append( "\n" );
            for ( var prop in obj ){
                if ( prop == "_props" || prop == "_name" || prop == "$" )
                    continue;
                
                var child = obj[prop];
	       
		if ( isArray( obj ) && isObject( child ) && child._name && prop.match( /\d+/ ) )
		    xml.to( append , null , child , indent + 1 );
                else
                    xml.to( append , prop , child , indent + 1 );
            }
        }
        else {
            append( obj );
        }

        if ( obj["$"] )
            append( obj["$"] );
        
        if ( name ){
            if ( newLine )
                xml._indent( append , indent );
            append( "</" + name + ">\n" );
        }

    } ,
    
    toArray : function( append, name, obj, indent ){
        for( var i=0; i<obj.length; i++ ){
            xml.to(append, null , obj[i], indent);
        }
    } ,

    _indent : function( append , indent ){
        for ( var i=0; i<indent; i++ )
            append( " " );
    } ,

    fromString : function( s ){
        return xml.from(xml._xmlTokenizer(s));
    },

    _re_nonspace : /[^ \t\n]/,
    _re_space : /[ \t\n]/,
    _re_word : /[^\w&;]/,

    _xmlTokenizer : function( s ){
        var pos = 0;
        var insideTag = false;
        var attrName = false;
        var attrValue = false;
        var tagName = false;
        var f = function(){
            if(f.lookahead){
                l = f.lookahead;
                f.lookahead = null;
                return l;
            }
            var exec = xml._re_nonspace.exec(s);
            if (exec == null) return -1;
            var start = exec.index;
            var sub = s.substring(start, s.length);
            if(insideTag == false){
                if(s[start] == "<"){
                    insideTag = true;
                    var s2 = xml._re_nonspace.exec(sub.substring(1, sub.length)).index+1;
                    if(sub[s2] == "?"){
                        s = sub.substring(s2+1, sub.length);
                        return "<?";
                    }
                    s = s.substring(start+1, s.length);
                    return "<";
                }
                var next = sub.indexOf("<");
                s = sub.substring(next, sub.length);
                return sub.substring(0, next);
            }
            else {
                if(s[start] == "?"){
                    var s2 = xml._re_nonspace.exec(sub.substring(1, sub.length)).index+1;
                    if(sub[s2] == ">"){
                        s = sub.substring(s2+1, sub.length);
                        tagName = insideTag = false;
                        return "?>";
                    }
                }
                if(s[start] == "/"){
                    s = s.substring(start+1, s.length);
                    return "/";
                }
                if(s[start] == ">"){
                    tagName = insideTag = false;
                    s = s.substring(start+1, s.length);
                    return ">";
                }
                if(!tagName){
                    var s2 = xml._re_word.exec(sub).index;
                    s = s.substring(start+s2, s.length);
                    tagName = true;
                    return sub.substring(0, s2);
                }
                if(!attrName){
                    var s2 = xml._re_word.exec(sub).index;
                    s = sub.substring(s2, sub.length);
                    attrName = true;
                    return sub.substring(0, s2);
                }
                if(attrValue){
                    var q = sub[0];
                    var r = q+"(.+)"+q+"(.*)";
                    var results = new RegExp(r).exec(sub);
                    s = results[2];
                    attrName = attrValue = false;
                    return results[1];
                }
                else if(!attrValue) {
                    var s2 = sub.indexOf("=");
                    s = sub.substring(s2+1, sub.length);
                    attrValue = true;
                    return "=";
                }
                
            }
        };
        return f;
    },

    from : function( tokenizer ){
        var i = 0;

        var next = tokenizer();
        if(next == "<?"){
            // XML declaration
            // FIXME: do something
            while (next != "?>") next = tokenizer();
        }
        else tokenizer.lookahead = next;

        return xml._from(tokenizer);
    } ,

    _from : function( tokenizer ){
        var root = {};
        var next = tokenizer();
        if(next != "<") return next;
        tokenizer.lookahead = next;

        while(true){
            next = tokenizer();
            if (next == -1) break;
            if (next == "<"){
                var name = tokenizer();
                if(name == "/"){
                    // our root element just ended; return what we have
                    return root;
                }
                var props = {};
                var slash = false;
                var hasprops = false;
                next = tokenizer();
                while(next != ">"){
                    if (next == "/") slash = true;
                    else{
                        var eq = tokenizer();
                        var val = tokenizer();
                        props[next] = val;
                        hasprops = true;
                    }
                    next = tokenizer();
                }
                if(! slash){
                    var result = xml._from(tokenizer);
                    // Either we just read a literal, in which case
                    // we need to read </name>, or the recursion ended after 
                    // reading </, so we need to read name>.
                    var next = tokenizer();
                    if(next == "<"){ tokenizer(); next = tokenizer(); }
                    tokenizer();
                    if(name != next) { 
                        print ("Error: malformed XML -- "+name+" does not match "+next); 
                    } 
                }
                else var result = null;
                if(hasprops)
                    result._props = props;
                if(isArray(root)){
                    result._name = name;
                    root.push(result);
                }
               else if(haskey(root, name)){
                   var array = [];
                   for (var prop in root){
                       child = root[prop];
                       if(isObject(child)){
                           child._name = prop;
                           array.push(child);
                       }
                       else{
                           array.push({_name: name, "$": child});
                       }

                   }
                   result._name = name;
                    array.push(result);
                    root = array;
                }
                else {
                    root[name] = result;
                }
            }
        }
        
        return root;
        
    }
    
};

function haskey(obj, prop){
    for (var i in obj){
        if (i == prop){
            return true;
        }
    }
    return false;
}
