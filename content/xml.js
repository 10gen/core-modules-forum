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
                if ( prop == "_props" || prop == "_name" )
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
        
        if ( name ){
            if ( newLine )
                xml._indent( append , indent );
            append( "</" + name + ">\n" );
        }

    } ,
    
    _indent : function( append , indent ){
        for ( var i=0; i<indent; i++ )
            append( " " );
    }

    
    
};
