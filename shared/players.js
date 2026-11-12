// Llista de jugadors persistent a localStorage, comuna a tots els jocs.
// Ordenada per lastPlayed descendent; els noms es comparen sense distingir majúscules.
window.Players = ( () => {
  function normalize( name ) {
    return name.toLocaleLowerCase( 'ca' );
  }

  function isValidPlayer( player ) {
    return player !== null
      && typeof player === 'object'
      && typeof player.name === 'string'
      && player.name.length > 0
      && Number.isFinite( player.lastPlayed );
  }

  // Elimina duplicats per majúscules (es queda el més recent) i ordena per lastPlayed descendent
  function dedupeAndSort( list ) {
    const byName = new Map();
    list.forEach( ( player ) => {
      const key = normalize( player.name );
      const current = byName.get( key );
      if ( !current || player.lastPlayed > current.lastPlayed ) byName.set( key, player );
    } );
    return [ ...byName.values() ].sort( ( a, b ) => b.lastPlayed - a.lastPlayed );
  }

  // Llegeix els noms de les entrades d'un rànquing (només la validació mínima necessària)
  function readRankingPlayers( storageKey ) {
    try {
      const parsed = JSON.parse( localStorage.getItem( storageKey ) );
      if ( !Array.isArray( parsed ) ) return [];
      return parsed
        .filter( ( entry ) => entry !== null && typeof entry === 'object'
          && typeof entry.name === 'string' && entry.name.length > 0
          && Number.isFinite( entry.date ) )
        .map( ( entry ) => ( { name: entry.name, lastPlayed: entry.date } ) );
    } catch ( error ) {
      return [];
    }
  }

  function create( { storageKey, importFrom = [] } ) {
    let players = [];

    function save() {
      try {
        localStorage.setItem( storageKey, JSON.stringify( players ) );
      } catch ( error ) {
        // localStorage no disponible: la llista continua només en memòria
      }
    }

    // Primer ús (clau inexistent): s'importen els noms dels rànquings i es desa,
    // encara que sigui buit, perquè la importació només passi una vegada
    function importFromRankings() {
      players = dedupeAndSort( importFrom.flatMap( ( ranking ) => readRankingPlayers( ranking.storageKey ) ) );
      save();
    }

    function load() {
      players = [];
      let raw;
      try {
        raw = localStorage.getItem( storageKey );
      } catch ( error ) {
        return;
      }
      if ( raw === null ) {
        importFromRankings();
        return;
      }
      try {
        const parsed = JSON.parse( raw );
        if ( Array.isArray( parsed ) ) players = dedupeAndSort( parsed.filter( isValidPlayer ) );
      } catch ( error ) {
        players = [];
      }
    }

    // Retorna la grafia registrada del jugador i n'actualitza lastPlayed
    function register( name ) {
      const key = normalize( name );
      const existing = players.find( ( player ) => normalize( player.name ) === key );
      const player = existing || { name, lastPlayed: 0 };
      player.lastPlayed = Date.now();
      if ( !existing ) players.push( player );
      players.sort( ( a, b ) => b.lastPlayed - a.lastPlayed );
      save();
      return player.name;
    }

    return {
      load,
      register,
      isEmpty: () => players.length === 0,
      get names() {
        return players.map( ( player ) => player.name );
      }
    };
  }

  return { create };
} )();
