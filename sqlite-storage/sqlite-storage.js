var DBHandler = {
	db: null,
	create: function(){
		console.log('DBHandler.create');
		if( typeof(window.cordova)==='undefined' || ( typeof(window.cordova)!=='undefined' && window.cordova.platformId === 'browser' ) ) {
			if( typeof(window.openDatabase)!=='undefined' ) {
				this.db = window.openDatabase('app.db', '1.0', 'Data', 2*1024*1024);
				console.log('WebSql');
			}else console.log('WebSql only on chrome');
		}else{
			this.db = window.sqlitePlugin.openDatabase({name: 'app.db', location: 'default'});
			console.log('SQLite');
		}
		if( this.db == null ) return;
		this.db.transaction(function(tx){
			tx.executeSql("create table if not exists vars(`name` text primary key, `value` text)",
				[],
				function(tx, results){
				},function(tx, e){
					console.log('Error while creating the table: ' + e.message);
				}
			);
		},function(e){
			console.log('Transaction error: ' + e.message);
		},function(){
			console.log('Create DB transaction complete successfully');
		});
	},

	getVars: function(name, callback){
		if( typeof(name)==='undefined' ) return;
		if( this.db == null ) return;
		value = false;
		this.db.transaction(function(tx){
			tx.executeSql('SELECT `value` FROM vars WHERE `name`=?',
				[name],
				function(tx, results){
					var len = results.rows.length;
					//console.log(len);
					value = null;
					if( len > 0 ){
						value = (results.rows.item(0)['value']);
					}
					if( value != null ) {
						value = value + '';
						if( value.match(/^\{/gi) && value.match(/\}$/gi) ){
							value = JSON.parse(value);
						}
					}
					if( typeof(callback)==='function' ) {
						callback(name, value);
					}
				},function(tx, e){
					console.log('Error while execute query: ' + e.message);
				}
			);
		});
	},
	getVarsLike: function(name, callback){
		if( typeof(name)==='undefined' ) return;
		if( this.db == null ) return;
		value = false;
		this.db.transaction(function(tx){
			tx.executeSql('SELECT `value` FROM vars WHERE (`name` LIKE ?) ORDER BY `name` desc ',
				[name],
				function(tx, results){
					var len = results.rows.length;
					//console.log(len);
					value = null;
					if( len > 0 ){
						value = [];
						for(i=0; i<len; i++) {
							value[i] = results.rows.item(i)['value'];
							if( value[i] != null ) {
								value[i] = value[i] + '';
								if( value[i].match(/^\{/gi) && value[i].match(/\}$/gi) ){
									value[i] = JSON.parse(value[i]);
								}
							}
						}
					}
					if( typeof(callback)==='function' ) {
						callback(name, value);
					}
				},function(tx, e){
					console.log('Error while execute query: ' + e.message);
				}
			);
		});
	},
	setVars: function(name, value, callback){
		if( typeof(name)==='undefined' ) return;
		if( this.db == null ) return;
		if( typeof(value)!=='string' ) value = JSON.stringify(value);
		this.db.transaction(function(tx){
			tx.executeSql('SELECT `value` FROM vars WHERE `name`=?',
				[name],
				function(tx, results){
					var len = results.rows.length;
					if( len > 0 ){
						tx.executeSql('UPDATE vars set `value`=? WHERE `name`=?',
							[value, name],
							function(tx, results){
								if( value != null ) {
									value = value + '';
									if( value.match(/^\{/gi) && value.match(/\}$/gi) ){
										value = JSON.parse(value);
									}
								}
								if( typeof(callback)==='function' ) {
									callback(name, value);
								}
							},function(tx, e){
								console.log('Error while execute query: ' + e.message);
							}
						);
					}else{
						tx.executeSql('INSERT into vars(`value`,`name`) values(?,?)',
							[value, name],
							function(tx, results){
								if( value != null ) {
									value = value + '';
									if( value.match(/^\{/gi) && value.match(/\}$/gi) ){
										value = JSON.parse(value);
									}
								}
								if( typeof(callback)==='function' ) {
									callback(name, value);
								}
							},function(tx, e){
								console.log('Error while execute query: ' + e.message);
							}
						);
					}
				},function(tx, e){
					console.log('Error while execute query: ' + e.message);
				}
			);
		});
	},
	delVars: function(name, callback){
		if( typeof(name)==='undefined' ) return;
		if( this.db == null ) return;
		value = false;
		this.db.transaction(function(tx){
			tx.executeSql('DELETE FROM vars WHERE `name`=?',
				[name],
				function(tx, results){
					if( typeof(callback)==='function' ) {
						callback(name);
					}
				},function(tx, e){
					console.log('Error while execute query: ' + e.message);
				}
			);
		});
	},

}
