#include "board.h"
#include <iostream>
#include <cstring>

using namespace std;

void separator(string title){
    cout << "\n====================================\n";
    cout << title << "\n";
    cout << "====================================\n";
}

int main(){

    // ─────────────────────────────────────────────
    // 1. NORMAL MOVE
    // ─────────────────────────────────────────────
    {
        separator("1. NORMAL MOVE");

        Board b;
        b.initialise();

        Move m = b.makeMove("e2","e4");

        cout << "After e2-e4:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 2. SIMPLE CAPTURE
    // ─────────────────────────────────────────────
    {
        separator("2. SIMPLE CAPTURE");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::WHITE][Board::PAWN] =
            StringToBB("e4");

        b.pieces[Board::BLACK][Board::PAWN] =
            StringToBB("d5");

        cout << "Before:\n";
        b.print();

        Move m = b.makeMove("e4","d5");

        cout << "\nAfter Capture:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 3. DOUBLE PAWN PUSH
    // ─────────────────────────────────────────────
    {
        separator("3. DOUBLE PAWN PUSH");

        Board b;
        b.initialise();

        Move m = b.makeMove("e2","e4");

        b.print();

        cout << "\nEn Passant Square: "
             << b.enPassantSquare << "\n";

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 4. EN PASSANT
    // ─────────────────────────────────────────────
    {
        separator("4. EN PASSANT");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::WHITE][Board::PAWN] =
            StringToBB("e5");

        b.pieces[Board::BLACK][Board::PAWN] =
            StringToBB("d7");

        cout << "Initial:\n";
        b.print();

        Move m1 = b.makeMove("d7","d5");

        cout << "\nAfter d7-d5:\n";
        b.print();

        Move m2 = b.makeMove("e5","d6");

        cout << "\nAfter En Passant:\n";
        b.print();

        b.unmakeMove(m2);

        cout << "\nUndo En Passant:\n";
        b.print();

        b.unmakeMove(m1);

        cout << "\nUndo d7-d5:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 5. WHITE KING SIDE CASTLE
    // ─────────────────────────────────────────────
    {
        separator("5. WHITE KING SIDE CASTLE");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::WHITE][Board::KING] =
            StringToBB("e1");

        b.pieces[Board::WHITE][Board::ROOK] =
            StringToBB("h1");

        cout << "Before Castle:\n";
        b.print();

        Move m = b.makeMove("e1","g1");

        cout << "\nAfter Castle:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 6. WHITE QUEEN SIDE CASTLE
    // ─────────────────────────────────────────────
    {
        separator("6. WHITE QUEEN SIDE CASTLE");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::WHITE][Board::KING] =
            StringToBB("e1");

        b.pieces[Board::WHITE][Board::ROOK] =
            StringToBB("a1");

        cout << "Before Castle:\n";
        b.print();

        Move m = b.makeMove("e1","c1");

        cout << "\nAfter Castle:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 7. BLACK KING SIDE CASTLE
    // ─────────────────────────────────────────────
    {
        separator("7. BLACK KING SIDE CASTLE");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::BLACK][Board::KING] =
            StringToBB("e8");

        b.pieces[Board::BLACK][Board::ROOK] =
            StringToBB("h8");

        b.sideToMove = Board::BLACK;

        cout << "Before Castle:\n";
        b.print();

        Move m = b.makeMove("e8","g8");

        cout << "\nAfter Castle:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 8. PROMOTION
    // ─────────────────────────────────────────────
    {
        separator("8. PROMOTION");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::WHITE][Board::PAWN] =
            StringToBB("e7");

        cout << "Before Promotion:\n";
        b.print();

        Move m = b.makeMove(
            "e7",
            "e8",
            Board::QUEEN
        );

        cout << "\nAfter Promotion:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 9. PROMOTION CAPTURE
    // ─────────────────────────────────────────────
    {
        separator("9. PROMOTION CAPTURE");

        Board b;
        memset(b.pieces,0,sizeof(b.pieces));

        b.pieces[Board::WHITE][Board::PAWN] =
            StringToBB("g7");

        b.pieces[Board::BLACK][Board::ROOK] =
            StringToBB("h8");

        cout << "Before:\n";
        b.print();

        Move m = b.makeMove(
            "g7",
            "h8",
            Board::QUEEN
        );

        cout << "\nAfter Promotion Capture:\n";
        b.print();

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 10. MULTIPLE MOVE STACK TEST
    // ─────────────────────────────────────────────
    {
        separator("10. MULTIPLE MOVE STACK");

        Board b;
        b.initialise();

        Move m1 = b.makeMove("e2","e4");
        Move m2 = b.makeMove("e7","e5");
        Move m3 = b.makeMove("g1","f3");
        Move m4 = b.makeMove("b8","c6");

        cout << "After Sequence:\n";
        b.print();

        b.unmakeMove(m4);
        b.unmakeMove(m3);
        b.unmakeMove(m2);
        b.unmakeMove(m1);

        cout << "\nAfter All Undo:\n";
        b.print();
    }

    // ─────────────────────────────────────────────
    // 11. ROOK MOVE CASTLING RIGHTS
    // ─────────────────────────────────────────────
    {
        separator("11. ROOK MOVE CASTLING RIGHTS");

        Board b;
        b.initialise();

        Move m = b.makeMove("h1","h2");

        cout << "White King Side Right: "
             << b.castlingRights.WhiteKingSide << "\n";

        b.unmakeMove(m);

        cout << "After Undo:\n";
        cout << "White King Side Right: "
             << b.castlingRights.WhiteKingSide << "\n";
    }

    // ─────────────────────────────────────────────
    // 12. KING MOVE CASTLING RIGHTS
    // ─────────────────────────────────────────────
    {
        separator("12. KING MOVE CASTLING RIGHTS");

        Board b;
        b.initialise();

        Move m = b.makeMove("e1","e2");

        cout << "White King Side Right: "
             << b.castlingRights.WhiteKingSide << "\n";

        cout << "White Queen Side Right: "
             << b.castlingRights.WhiteQueenSide << "\n";

        b.unmakeMove(m);

        cout << "\nAfter Undo:\n";

        cout << "White King Side Right: "
             << b.castlingRights.WhiteKingSide << "\n";

        cout << "White Queen Side Right: "
             << b.castlingRights.WhiteQueenSide << "\n";
    }

    return 0;
}