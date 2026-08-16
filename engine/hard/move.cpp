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
    move.piece          = -1;
    move.colour         = -1;
    move.capturedPiece  = -1;
    move.capturedColour = -1;
    move.isEnPassant    = false;
    move.isCastle       = false;
    move.promotion      = promotion;
    move.prevEnPassant  = enPassantSquare;
    move.prevCastling   = castlingRights;

    BB fromBB = 1ULL << from;
    BB toBB   = 1ULL << to;

    for(int p=0;p<6;p++){
        if(pieces[0][p]&fromBB){ move.piece=p; move.colour=0; break; }
        if(pieces[1][p]&fromBB){ move.piece=p; move.colour=1; break; }
    }

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

bool Board::isInCheck(int colour) {
    int enemy = 1 - colour;

    BB kingBB = pieces[colour][KING];
    int kingIdx = 0;
    while (!((kingBB >> kingIdx) & 1)) kingIdx++;
    string kingSq = indexToSquare(kingIdx);

    if(colour == 0) {
        BB kingBit = 1ULL << kingIdx;
        BB pawnAttacks = ((kingBit << 9) & ~afile) | ((kingBit << 7) & ~hfile);
        if (pawnAttacks & pieces[enemy][PAWN]) return true;
    }
    else{
        BB kingBit = 1ULL << kingIdx;
        BB pawnAttacks = ((kingBit >> 9) & ~hfile) | ((kingBit >> 7) & ~afile);
        if(pawnAttacks & pieces[enemy][PAWN]) return true;
    }

    BB knightMoves = KnightMoves(kingSq, colour);
    if(knightMoves & pieces[enemy][KNIGHT]) return true;

    BB bishopQueenAttacks = BishopMoves(kingSq, colour);
    if(bishopQueenAttacks & (pieces[enemy][BISHOP] | pieces[enemy][QUEEN])) return true;

    BB rookQueenAttacks = RookMoves(kingSq, colour);
    if(rookQueenAttacks & (pieces[enemy][ROOK] | pieces[enemy][QUEEN])) return true;

    BB kingAttacks = KingMoves(kingSq, colour);
    if(kingAttacks & pieces[enemy][KING]) return true;

    return false;
}
