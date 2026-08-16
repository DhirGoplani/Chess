#pragma once
#include<iostream>
#include<vector>
#include<cstdint>
#include<cstring>

using namespace std;
using BB = uint64_t;

BB StringToBB(string square);
int squareToIndex(string square);
string indexToSquare(int idx);

class Direction {
public:
    int shift;
    BB mask;
    Direction(int shift, BB mask);
    BB apply(BB board);
};

class CastlingRights {
public:
    bool WhiteKingSide;
    bool WhiteQueenSide;
    bool BlackKingSide;
    bool BlackQueenSide;
    CastlingRights(){
        WhiteKingSide  = true;
        WhiteQueenSide = true;
        BlackKingSide  = true;
        BlackQueenSide = true;
    }
};

// Move struct
struct Move {
    int from;
    int to;
    int piece;
    int colour;
    int capturedPiece  = -1;
    int capturedColour = -1;
    bool isEnPassant   = false;
    bool isCastle      = false;
    int promotion      = -1;
    string prevEnPassant;  
    CastlingRights prevCastling;
};

class Board {
public:
    static const BB afile = 0x0101010101010101ULL;
    static const BB hfile = afile << 7;
    static const BB rank1 = 0x00000000000000FFULL;
    static const BB rank8 = rank1 << 56;
    int sideToMove = 0;
    BB pieces[2][6];
    string enPassantSquare = "";  
    CastlingRights castlingRights;
    enum Piece  { PAWN, ROOK, KNIGHT, BISHOP, QUEEN, KING };
    enum Colour { WHITE, BLACK };

    void initialise();
    void print();
    void printMoves(BB moves);

    BB WhitePawnMoves(string square);
    BB BlackPawnMoves(string square);
    BB KnightMoves(string square, int colour);
    BB KingMoves(string square, int colour);
    BB SlidingMoves(string square, int colour, vector<Direction> dirs);
    BB BishopMoves(string square, int colour);
    BB RookMoves(string square, int colour);
    BB QueenMoves(string square, int colour);

    // New functions
    Move makeMove(string from, string to, int promotion = -1);
    void unmakeMove(Move& move);
    bool isInCheck(int colour);
    bool isSquareAttacked(int idx, int colour); // colour = side that would stand there
};
