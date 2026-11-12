// Pantalles de selecció de jugador ('list': rànquing + jugadors existents) i
// d'entrada del nom ('name'), comunes a tots els jocs. Es dibuixen al canvas del joc.
window.PlayerSelect = ( () => {
  const LIST_ROW_HEIGHT = 30;
  const LIST_WIDTH = 300;
  const LIST_RIGHT_MARGIN = 330;   // a 800 px d'ample, la llista comença a x=470
  const LIST_HEADER_Y = 150;
  const TABLE_LEFT = 30;
  const NEW_PLAYER_LABEL = 'Nou jugador';
  const LIST_VISIBLE_ROWS = 11;    // files visibles (jugadors + «Nou jugador»); la resta es desplaça
  const SCROLL_INDICATOR_COLOR = '#aaa';

  function create( {
    ctx,
    width,
    height,
    title,
    ranking,
    players,
    nameMaxLength = 10,
    defaultName = 'ANÒNIM',
    onPlayerChosen
  } ) {
    const listLeft = width - LIST_RIGHT_MARGIN;
    let screen = 'list';
    let playerOptions = [];
    let selectedIndex = 0;
    let scrollOffset = 0;            // índex de la primera fila visible de la llista
    let nameInput = '';

    function optionCount() {
      return playerOptions.length + 1;
    }

    function maxScrollOffset() {
      return Math.max( 0, optionCount() - LIST_VISIBLE_ROWS );
    }

    // Desplaça la finestra el mínim necessari perquè la selecció es vegi
    function ensureSelectionVisible() {
      if ( selectedIndex < scrollOffset ) {
        scrollOffset = selectedIndex;
      } else if ( selectedIndex >= scrollOffset + LIST_VISIBLE_ROWS ) {
        scrollOffset = selectedIndex - LIST_VISIBLE_ROWS + 1;
      }
    }

    function enterList() {
      playerOptions = players.names;
      selectedIndex = 0;
      scrollOffset = 0;
      nameInput = '';
      screen = 'list';
    }

    function enterName() {
      nameInput = '';
      screen = 'name';
    }

    function start() {
      if ( players.isEmpty() ) {
        enterName();
      } else {
        enterList();
      }
    }

    function confirmSelection() {
      if ( selectedIndex < playerOptions.length ) {
        onPlayerChosen( players.register( playerOptions[ selectedIndex ] ) );
      } else {
        enterName();
      }
    }

    function getListRowAt( x, y ) {
      if ( x < listLeft || x > listLeft + LIST_WIDTH ) return -1;
      const firstRowTop = LIST_HEADER_Y + LIST_ROW_HEIGHT / 2;
      const row = Math.floor( ( y - firstRowTop ) / LIST_ROW_HEIGHT );
      const visibleRows = Math.min( LIST_VISIBLE_ROWS, optionCount() - scrollOffset );
      return row >= 0 && row < visibleRows ? scrollOffset + row : -1;
    }

    function drawList() {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 40px sans-serif';
      ctx.fillText( title, width / 2, 50 );
      ctx.font = '22px sans-serif';
      ctx.fillText( 'Tria jugador', width / 2, 95 );

      ctx.fillStyle = '#fff';
      ranking.drawTable( ctx, TABLE_LEFT, LIST_HEADER_Y, null );

      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'left';
      ctx.fillText( 'Jugadors', listLeft, LIST_HEADER_Y );

      ctx.font = '18px monospace';
      const lastVisible = Math.min( optionCount(), scrollOffset + LIST_VISIBLE_ROWS ) - 1;
      for ( let i = scrollOffset; i <= lastVisible; i++ ) {
        const isNewPlayer = i === playerOptions.length;
        const y = LIST_HEADER_Y + ( i - scrollOffset + 1 ) * LIST_ROW_HEIGHT;
        const selected = i === selectedIndex;
        if ( selected ) {
          ctx.fillStyle = 'rgba(255, 235, 59, 0.2)';
          ctx.fillRect( listLeft - 8, y - LIST_ROW_HEIGHT / 2, LIST_WIDTH, LIST_ROW_HEIGHT );
        }
        ctx.fillStyle = selected ? '#ffeb3b' : ( isNewPlayer ? '#aaa' : '#fff' );
        ctx.textAlign = 'left';
        ctx.fillText( ( selected ? '> ' : '  ' ) + ( isNewPlayer ? NEW_PLAYER_LABEL : playerOptions[ i ] ), listLeft, y );
      }

      // Indicadors de files amagades: ▲ a la capçalera, ▼ sota l'última fila visible
      ctx.fillStyle = SCROLL_INDICATOR_COLOR;
      ctx.textAlign = 'right';
      const indicatorX = listLeft + LIST_WIDTH - 16;
      if ( scrollOffset > 0 ) {
        ctx.fillText( '▲', indicatorX, LIST_HEADER_Y );
      }
      if ( scrollOffset < maxScrollOffset() ) {
        ctx.fillText( '▼', indicatorX, LIST_HEADER_Y + ( LIST_VISIBLE_ROWS + 1 ) * LIST_ROW_HEIGHT );
      }

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '16px sans-serif';
      ctx.fillText( '↑↓ per triar · Enter o clic per jugar', width / 2, height - 40 );
    }

    function drawName() {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 56px sans-serif';
      ctx.fillText( title, width / 2, height / 2 - 100 );

      ctx.font = '24px sans-serif';
      ctx.fillText( 'Escriu el teu nom', width / 2, height / 2 - 30 );

      const cursorVisible = Math.floor( performance.now() / 500 ) % 2 === 0;
      ctx.font = 'bold 36px monospace';
      ctx.fillText( nameInput + ( cursorVisible ? '_' : ' ' ), width / 2, height / 2 + 20 );

      ctx.font = '16px sans-serif';
      ctx.fillText( 'Prem Enter per començar', width / 2, height / 2 + 80 );
      if ( !players.isEmpty() ) {
        ctx.fillText( 'Esc per tornar', width / 2, height / 2 + 108 );
      }
    }

    function handleListKey( e ) {
      const count = optionCount();
      if ( e.key === 'ArrowUp' ) {
        e.preventDefault();
        selectedIndex = ( selectedIndex - 1 + count ) % count;
        ensureSelectionVisible();
      } else if ( e.key === 'ArrowDown' ) {
        e.preventDefault();
        selectedIndex = ( selectedIndex + 1 ) % count;
        ensureSelectionVisible();
      } else if ( e.key === 'Enter' ) {
        e.preventDefault();
        confirmSelection();
      }
    }

    function handleNameKey( e ) {
      if ( e.key === 'Escape' ) {
        if ( !players.isEmpty() ) enterList();
      } else if ( e.key === 'Backspace' ) {
        e.preventDefault();
        nameInput = nameInput.slice( 0, -1 );
      } else if ( e.key === 'Enter' ) {
        e.preventDefault();
        onPlayerChosen( players.register( nameInput.trim() || defaultName ) );
      } else if ( e.key === ' ' ) {
        e.preventDefault();
        if ( nameInput.length > 0 && nameInput.length < nameMaxLength ) {
          nameInput += ' ';
        }
      } else if ( !e.ctrlKey && !e.metaKey && !e.altKey && /^[\p{L}\p{N}]$/u.test( e.key ) ) {
        if ( nameInput.length < nameMaxLength ) {
          nameInput += e.key;
        }
      }
    }

    return {
      start,
      draw() {
        if ( screen === 'list' ) drawList(); else drawName();
      },
      handleKey( e ) {
        if ( screen === 'list' ) handleListKey( e ); else handleNameKey( e );
      },
      // Retorna true si el moviment s'ha consumit (llista de jugadors); a l'entrada
      // del nom el joc el pot continuar fent servir
      handleMouseMove( x, y ) {
        if ( screen !== 'list' ) return false;
        const row = getListRowAt( x, y );
        if ( row !== -1 ) selectedIndex = row;
        return true;
      },
      handleClick( x, y ) {
        if ( screen !== 'list' ) return;
        const row = getListRowAt( x, y );
        if ( row === -1 ) return;
        selectedIndex = row;
        confirmSelection();
      },
      // Desplaça la llista una fila per pas sense canviar la selecció.
      // Retorna true si l'event s'ha consumit (llista de jugadors)
      handleWheel( deltaY ) {
        if ( screen !== 'list' ) return false;
        const step = Math.sign( deltaY );
        scrollOffset = Math.min( maxScrollOffset(), Math.max( 0, scrollOffset + step ) );
        return true;
      }
    };
  }

  return { create };
} )();
