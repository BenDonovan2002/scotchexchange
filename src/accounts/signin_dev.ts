/**
 * Checks to see if the user data entered is equal to what is in the
 * database. If so, then it generated a UUID and redirects the user
 * to the dashboard page whilst specifiying this UUID. 
 * @param username The entered username
 * @param password The entered password
 * @param redirectUser The callback function used to redirect the user
 */
export function SignInUserDEV ( username: string, password: string, redirectUser?: CallableFunction ): void {

    if ( username.toLowerCase() == "admin" && password == "1" ){
        if ( redirectUser != undefined ){ redirectUser( "admin" ) }
    } else {
        if ( redirectUser != undefined ){ redirectUser( null ) }
    }

    /*var con: Connection = mysql.createConnection( sql_info.getSQL() );
    con.connect( function( err: MysqlError ){
        if ( err ) throw err;

        con.query( `SELECT id, password FROM users WHERE username=? OR email=?;`,
            [ username, username ],
            function( err: MysqlError | null, resultSet ) {
                if ( err ) { throw err; }

                const result = Array.from( resultSet ).length > 0 ? ( Array.from( resultSet )[0] as any ) : null;

                if ( result == null || result.password != password ) {
                    // Redirect to incorrect details page
                    con.end();
                    if ( redirectUser != undefined ){ redirectUser( null ) }
                    
                } else {
                    const UUID: string = GenerateSecureSID();
                    con.query( "UPDATE users SET sessionID=? WHERE id=?;",
                    [ UUID, result.id ],
                    function ( err: MysqlError | null ){
                        if ( err ){ throw err; }
                        con.end();
                        if ( redirectUser != undefined ){ redirectUser( UUID ) }
                    } );
                }
            } 
        );
    } );*/
}
