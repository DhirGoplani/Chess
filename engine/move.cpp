#include "board.h"

int squareToIndex(string square){
    int file = square[0]-'a';
    int rank = square[1]-'1';
    return rank*8+file;
}

string indexToSquare(int idx){
    char file = 'a'+(idx%8);
    int  rank = (idx/8)+1;
    return string(1,file)+to_string(rank);
}

Move Board::makeMove(string fromSq, string toSq, int promotion){
    int from = squareToIndex(fromSq);
    int to   = squareToIndex(toSq);

    Move move;
    move.from           = from;
    move.to             = to;
    move.piece          = -1;   // fix: explicit "not found" sentinel (was uninitialized)
    move.colour         = -1;   // fix: explicit "not found" sentinel (was uninitialized)
    move.capturedPiece  = -1;
    move.capturedColour = -1;
    move.isEnPassant    = false;
    move.isCastle       = false;
    move.promotion      = promotion;
    move.prevEnPassant  = enPassantSquare;
    move.prevCastling   = castlingRights;  // ← fix: save actual state

    BB fromBB = 1ULL << from;
    BB toBB   = 1ULL << to;

    for(int p=0;p<6;p++){
        if(pieces[0][p]&fromBB){ move.piece=p; move.colour=0; break; }
        if(pieces[1][p]&fromBB){ move.piece=p; move.colour=1; break; }
    }

    // fix: fromSq had no piece on it (e.g. caller/engine state desync).
    // Bail out now instead of indexing pieces[][] with garbage colour/piece
    // below, which was silently corrupting the board (phantom pieces).
    if(move.piece == -1){
        return move;
    }

    int sideToMove = move.colour;
    int enemy      = 1-sideToMove;

    for(int p=0;p<6;p++){
        if(pieces[enemy][p]&toBB){
            move.capturedPiece  = p;
            move.capturedColour = enemy;
            pieces[enemy][p]   &= ~toBB;
            // fix: capturing a rook on its home square revokes that side's
            // castling right, same as if the rook had moved away.
            if(p==ROOK){
                if(toSq=="a1") castlingRights.WhiteQueenSide=false;
                if(toSq=="h1") castlingRights.WhiteKingSide =false;
                if(toSq=="a8") castlingRights.BlackQueenSide=false;
                if(toSq=="h8") castlingRights.BlackKingSide =false;
            }
            break;
        }
    }

    if(move.piece==PAWN && toSq==enPassantSquare && enPassantSquare!=""){
        move.isEnPassant = true;
        int capturedPawnIdx = (sideToMove==0) ? to-8 : to+8;
        pieces[enemy][PAWN] &= ~(1ULL<<capturedPawnIdx);
        move.capturedPiece  = PAWN;
        move.capturedColour = enemy;
    }

    pieces[sideToMove][move.piece] &= ~fromBB;
    pieces[sideToMove][move.piece] |=  toBB;

    if(move.piece==PAWN && promotion!=-1){
        pieces[sideToMove][PAWN]      &= ~toBB;
        pieces[sideToMove][promotion] |=  toBB;
    }

    if(move.piece==KING){
        // ← fix: update castling rights
        if(sideToMove==0){ castlingRights.WhiteKingSide=false; castlingRights.WhiteQueenSide=false; }
        else              { castlingRights.BlackKingSide=false; castlingRights.BlackQueenSide=false; }

        int diff = to-from;
        if(diff==2){
            move.isCastle=true;
            if(sideToMove==0){ pieces[0][ROOK]&=~StringToBB("h1"); pieces[0][ROOK]|=StringToBB("f1"); }
            else              { pieces[1][ROOK]&=~StringToBB("h8"); pieces[1][ROOK]|=StringToBB("f8"); }
        }
        if(diff==-2){
            move.isCastle=true;
            if(sideToMove==0){ pieces[0][ROOK]&=~StringToBB("a1"); pieces[0][ROOK]|=StringToBB("d1"); }
            else              { pieces[1][ROOK]&=~StringToBB("a8"); pieces[1][ROOK]|=StringToBB("d8"); }
        }
    }

    if(move.piece==ROOK){
        if(fromSq=="a1") castlingRights.WhiteQueenSide=false;
        if(fromSq=="h1") castlingRights.WhiteKingSide =false;
        if(fromSq=="a8") castlingRights.BlackQueenSide=false;
        if(fromSq=="h8") castlingRights.BlackKingSide =false;
    }

    enPassantSquare="";
    if(move.piece==PAWN){
        int diff=to-from;
        if(diff== 16) enPassantSquare=indexToSquare(from+8);
        if(diff==-16) enPassantSquare=indexToSquare(from-8);
    }

    return move;
}

void Board::unmakeMove(Move& move){
    // fix: nothing was actually applied by a bailed-out makeMove() — don't
    // touch the board (colour/piece are -1 sentinels, not valid indices).
    if(move.piece == -1) return;

    int sideToMove = move.colour;
    int from       = move.from;
    int to         = move.to;

    BB fromBB = 1ULL<<from;
    BB toBB   = 1ULL<<to;

    int movedPiece = (move.promotion!=-1) ? move.promotion : move.piece;
    pieces[sideToMove][movedPiece] &= ~toBB;
    pieces[sideToMove][move.piece] |=  fromBB;

    if(move.capturedPiece!=-1 && !move.isEnPassant)
        pieces[move.capturedColour][move.capturedPiece] |= toBB;

    if(move.isEnPassant){
        int capturedSq = (sideToMove==0) ? to-8 : to+8;
        pieces[move.capturedColour][PAWN] |= (1ULL<<capturedSq);
    }

    if(move.isCastle){
        int diff=to-from;
        if(diff==2){
            if(sideToMove==0){ pieces[0][ROOK]|=StringToBB("h1"); pieces[0][ROOK]&=~StringToBB("f1"); }
            else              { pieces[1][ROOK]|=StringToBB("h8"); pieces[1][ROOK]&=~StringToBB("f8"); }
        }
        if(diff==-2){
            if(sideToMove==0){ pieces[0][ROOK]|=StringToBB("a1"); pieces[0][ROOK]&=~StringToBB("d1"); }
            else              { pieces[1][ROOK]|=StringToBB("a8"); pieces[1][ROOK]&=~StringToBB("d8"); }
        }
    }

    enPassantSquare = move.prevEnPassant;
    castlingRights  = move.prevCastling;  
}

// Is the square at `idx` attacked by the enemy of `colour`?
// (`colour` is the side that would be standing on / passing through that square —
// it's used the same way isInCheck used it: to mask the piece-move generators.)
bool Board::isSquareAttacked(int idx, int colour) {
    int enemy = 1 - colour;
    string sq = indexToSquare(idx);

    // Attacked by enemy pawns?
    if(colour == 0) {
        // White square — black pawns attack downward
        BB bit = 1ULL << idx;
        BB pawnAttacks = ((bit << 9) & ~afile) | ((bit << 7) & ~hfile);
        if (pawnAttacks & pieces[enemy][PAWN]) return true;
    }
    else{
        // Black square — white pawns attack upward
        BB bit = 1ULL << idx;
        BB pawnAttacks = ((bit >> 9) & ~hfile) | ((bit >> 7) & ~afile);
        if(pawnAttacks & pieces[enemy][PAWN]) return true;
    }

    // Attacked by enemy knights?
    BB knightMoves = KnightMoves(sq, colour); // reuse existing
    if(knightMoves & pieces[enemy][KNIGHT]) return true;

    // Attacked by enemy bishops or queens (diagonals)?
    BB bishopQueenAttacks = BishopMoves(sq, colour);
    if(bishopQueenAttacks & (pieces[enemy][BISHOP] | pieces[enemy][QUEEN])) return true;

    // Attacked by enemy rooks or queens (straights)?
    BB rookQueenAttacks = RookMoves(sq, colour);
    if(rookQueenAttacks & (pieces[enemy][ROOK] | pieces[enemy][QUEEN])) return true;

    // Attacked by enemy king?
    BB kingAttacks = KingMoves(sq, colour);
    if(kingAttacks & pieces[enemy][KING]) return true;

    return false;
}

bool Board::isInCheck(int colour) {
    // Find king's square
    BB kingBB = pieces[colour][KING];
    int kingIdx = 0;
    while (!((kingBB >> kingIdx) & 1)) kingIdx++;
    return isSquareAttacked(kingIdx, colour);
}