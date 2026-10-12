// Rànquing Top N persistent a localStorage, comú a tots els jocs.
// Cada joc en crea una instància amb la seva clau i, opcionalment, una columna extra.
window.Ranking = ( () => {
  const TABLE_ROW_HEIGHT = 30;

  function create( { storageKey, maxEntries = 10, extraField = null, extraLabel = null } ) {
    let entries = [];

    function isValidEntry( entry ) {
      return entry !== null
        && typeof entry === 'object'
        && typeof entry.name === 'string'
        && Number.isFinite( entry.score )
        && Number.isFinite( entry.date )
        && ( extraField === null || Number.isFinite( entry[ extraField ] ) );
    }

    function load() {
      entries = [];
      try {
        const raw = localStorage.getItem( storageKey );
        if ( !raw ) return;
        const parsed = JSON.parse( raw );
        if ( Array.isArray( parsed ) ) {
          entries = parsed.filter( isValidEntry ).slice( 0, maxEntries );
        }
      } catch ( error ) {
        entries = [];
      }
    }

    function save() {
      try {
        localStorage.setItem( storageKey, JSON.stringify( entries ) );
      } catch ( error ) {
        // localStorage no disponible: el rànquing continua només en memòria
      }
    }

    // Només substitueix l'entrada d'un jugador si en millora la puntuació.
    // Retorna l'entrada afegida, o null si no s'ha afegit res.
    function add( { name, score, extra } ) {
      const existingIndex = entries.findIndex( ( item ) => item.name === name );
      if ( existingIndex !== -1 ) {
        if ( score <= entries[ existingIndex ].score ) return null;
        entries.splice( existingIndex, 1 );
      }

      const entry = { name, score };
      if ( extraField !== null ) entry[ extraField ] = extra;
      entry.date = Date.now();

      entries.push( entry );
      entries.sort( ( a, b ) => b.score - a.score || a.date - b.date );
      entries = entries.slice( 0, maxEntries );
      save();
      return entry;
    }

    function playerNames() {
      return [ ...new Set( entries.map( ( entry ) => entry.name ) ) ];
    }

    function drawTable( ctx, left, top, highlightEntry ) {
      const columns = { position: left, name: left + 50, score: left + 320, extra: left + 400 };

      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'right';
      ctx.fillText( '#', columns.position, top );
      ctx.textAlign = 'left';
      ctx.fillText( 'Nom', columns.name, top );
      ctx.textAlign = 'right';
      ctx.fillText( 'Punts', columns.score, top );
      if ( extraField !== null ) ctx.fillText( extraLabel, columns.extra, top );

      ctx.font = '18px monospace';
      entries.forEach( ( entry, index ) => {
        const y = top + ( index + 1 ) * TABLE_ROW_HEIGHT;
        ctx.fillStyle = entry === highlightEntry ? '#ffeb3b' : '#fff';
        ctx.textAlign = 'right';
        ctx.fillText( `${ index + 1 }`, columns.position, y );
        ctx.textAlign = 'left';
        ctx.fillText( entry.name, columns.name, y );
        ctx.textAlign = 'right';
        ctx.fillText( `${ entry.score }`, columns.score, y );
        if ( extraField !== null ) ctx.fillText( `${ entry[ extraField ] }`, columns.extra, y );
      } );
    }

    return {
      load,
      add,
      playerNames,
      drawTable,
      isEmpty: () => entries.length === 0,
      get entries() {
        return entries.slice();
      }
    };
  }

  return { create };
} )();
