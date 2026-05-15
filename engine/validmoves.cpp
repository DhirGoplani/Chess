#include "board.h"
using namespace std;

BB StringToBB(string square){
    int x = square[0]-'a';
    int y = square[1]-'1';
    int idx = 8*y+x;
    return 1ULL << idx;
}

Direction::Direction(int shift, BB mask){
    this->shift = shift;
    this->mask  = mask;
}

BB Direction::apply(BB board){
    if(shift > 0) return (board << shift) & mask;
    return (board >> -shift) & mask;
}

void Board::initialise(){
    pieces[0][0] = StringToBB("a2")|StringToBB("b2")|StringToBB("c2")|StringToBB("d2")|
                   StringToBB("e2")|StringToBB("f2")|StringToBB("g2")|StringToBB("h2");
    pieces[0][1] = StringToBB("a1")|StringToBB("h1");
    pieces[0][2] = StringToBB("b1")|StringToBB("g1");
    pieces[0][3] = StringToBB("c1")|StringToBB("f1");
    pieces[0][4] = StringToBB("d1");
    pieces[0][5] = StringToBB("e1");
    pieces[1][0] = StringToBB("a7")|StringToBB("b7")|StringToBB("c7")|StringToBB("d7")|
                   StringToBB("e7")|StringToBB("f7")|StringToBB("g7")|StringToBB("h7");
    pieces[1][1] = StringToBB("a8")|StringToBB("h8");
    pieces[1][2] = StringToBB("b8")|StringToBB("g8");
    pieces[1][3] = StringToBB("c8")|StringToBB("f8");
    pieces[1][4] = StringToBB("d8");
    pieces[1][5] = StringToBB("e8");
}

void Board::print(){
    for(int rank = 7; rank >= 0; rank--){
        cout << rank+1 << " ";
        for(int file = 0; file < 8; file++){
            int idx = rank*8+file;
            BB mask = 1ULL << idx;
            char piece = '.';
            if(pieces[0][0]&mask) piece='P';
            if(pieces[0][1]&mask) piece='R';
            if(pieces[0][2]&mask) piece='N';
            if(pieces[0][3]&mask) piece='B';
            if(pieces[0][4]&mask) piece='Q';
            if(pieces[0][5]&mask) piece='K';
            if(pieces[1][0]&mask) piece='p';
            if(pieces[1][1]&mask) piece='r';
            if(pieces[1][2]&mask) piece='n';
            if(pieces[1][3]&mask) piece='b';
            if(pieces[1][4]&mask) piece='q';
            if(pieces[1][5]&mask) piece='k';
            cout << piece << " ";
        }
        cout << "\n";
    }
    cout << "\n   a b c d e f g h\n";
}

void Board::printMoves(BB moves){
    for(int i = 0; i < 64; i++){
        if(moves & (1ULL << i)){
            char file = 'a'+(i%8);
            int  rank = (i/8)+1;
            cout << file << rank << " ";
        }
    }
    cout << "\n";
}

BB Board::WhitePawnMoves(string square){
    BB pawn = StringToBB(square);
    BB ap = 0;
    for(int i=0;i<2;i++) for(int j=0;j<6;j++) ap|=pieces[i][j];
    BB moves = 0;
    BB singlepush = (pawn<<8)&~ap;
    moves |= singlepush;
    BB rank2 = rank1<<8;
    if(pawn&rank2) moves |= (singlepush<<8)&~ap;
    BB enemies = 0;
    for(int p=0;p<6;p++) enemies|=pieces[1][p];
    moves |= ((pawn<<9)&~afile)&enemies;
    moves |= ((pawn<<7)&~hfile)&enemies;
    if(enPassantSquare!=""){
        BB ep = StringToBB(enPassantSquare);
        moves |= ((pawn<<9)&~afile)&ep;
        moves |= ((pawn<<7)&~hfile)&ep;
    }
    return moves;
}

BB Board::BlackPawnMoves(string square){
    BB pawn = StringToBB(square);
    BB ap = 0;
    for(int i=0;i<2;i++) for(int j=0;j<6;j++) ap|=pieces[i][j];
    BB moves = 0;
    BB singlepush = (pawn>>8)&~ap;
    moves |= singlepush;
    BB rank7 = rank1<<48;
    if(pawn&rank7) moves |= (singlepush>>8)&~ap;
    BB enemies = 0;
    for(int p=0;p<6;p++) enemies|=pieces[0][p];
    moves |= ((pawn>>9)&~afile)&enemies;
    moves |= ((pawn>>7)&~hfile)&enemies;
    if(enPassantSquare!=""){
        BB ep = StringToBB(enPassantSquare);
        moves |= ((pawn>>9)&~afile)&ep;
        moves |= ((pawn>>7)&~hfile)&ep;
    }
    return moves;
}

BB Board::KnightMoves(string square, int colour){
    BB knight = StringToBB(square);
    BB notAB = ~(afile|(afile<<1));
    BB notGH = ~(hfile|(hfile>>1));
    BB moves = 0;
    moves |= (knight<<17)&~afile;
    moves |= (knight<<15)&~hfile;
    moves |= (knight<<10)&notAB;
    moves |= (knight<<6) &notGH;
    moves |= (knight>>15)&~afile;
    moves |= (knight>>17)&~hfile;
    moves |= (knight>>6) &notAB;
    moves |= (knight>>10)&notGH;
    BB friendly = 0;
    for(int p=0;p<6;p++) friendly|=pieces[colour][p];
    moves &= ~friendly;
    return moves;
}

BB Board::KingMoves(string square, int colour){
    BB king = StringToBB(square);
    BB moves = 0;
    moves |= (king<<8);
    moves |= (king>>8);
    moves |= (king<<1)&~afile;
    moves |= (king>>1)&~hfile;
    moves |= (king<<9)&~afile;
    moves |= (king<<7)&~hfile;
    moves |= (king>>7)&~afile;
    moves |= (king>>9)&~hfile;
    BB friendly = 0;
    for(int p=0;p<6;p++) friendly|=pieces[colour][p];
    moves &= ~friendly;
    return moves;
}

BB Board::SlidingMoves(string square, int colour, vector<Direction> dirs){
    BB moves = 0;
    BB ap = 0;
    for(int i=0;i<2;i++) for(int j=0;j<6;j++) ap|=pieces[i][j];
    BB friendly = 0;
    for(int p=0;p<6;p++) friendly|=pieces[colour][p];
    BB enemies = ap&~friendly;
    for(int i=0;i<(int)dirs.size();i++){
        BB ray = StringToBB(square);
        while(true){
            ray = dirs[i].apply(ray);
            if(ray==0) break;
            if(ray&friendly) break;
            moves |= ray;
            if(ray&enemies) break;
        }
    }
    return moves;
}

BB Board::BishopMoves(string square, int colour){
    vector<Direction> bishop={
        Direction(9,~Board::afile),
        Direction(-7,~Board::afile),
        Direction(7,~Board::hfile),
        Direction(-9,~Board::hfile)
    };
    return SlidingMoves(square,colour,bishop);
}

BB Board::RookMoves(string square, int colour){
    vector<Direction> rook={
        Direction(1,~Board::afile),
        Direction(-1,~Board::hfile),
        Direction(8,~0ULL),
        Direction(-8,~0ULL)
    };
    return SlidingMoves(square,colour,rook);
}

BB Board::QueenMoves(string square, int colour){
    return BishopMoves(square,colour)|RookMoves(square,colour);
}