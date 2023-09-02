const mongoose = require("mongoose");
const Transaction = require("../models/transfer");
const BankCard = require("../models/bankcards");
const Notification = require("../models/notifications");
const moment = require("moment");


const sendNotification = (amount, senderCardNumber, receiverCardNumber, userId) => {
    const notificationMessage = `Hesabınıza ${amount} azn pul köçdü. kart nömrəsi: ${receiverCardNumber}.`;
    const notification = new Notification({
        message: notificationMessage,
        isRead: false,
        amount: amount,
        sender: userId,
        card: receiverCardNumber
    });
    try {
        const savedNotification = notification.save();
    } catch (error) {
    }
};



const transferMoney = async (req, res) => {
    try {
        const { senderCardNumber, receiverCardNumber, amount } = req.body;
        const senderCard = await BankCard.findOne({ "cards.cardNumber": senderCardNumber });
        const receiverCard = await BankCard.findOne({ "cards.cardNumber": receiverCardNumber });
        if (!senderCard || !receiverCard) {
            return res.status(404).json({ message: "kart tapılmadı" });
        }
        for (let card of senderCard.cards) {
            // console.log(card.cardNumber, senderCardNumber);
            if (card.cardNumber === senderCardNumber) {
                if (card.balance <= amount) {
                    return res.status(404).json({ message: "balansda kifayət qədər pul yoxdur" });
                } else {
                    card.balance -= amount
                    let currentDate = new Date();
                    currentDate = currentDate.toString()

                    const outcomne = new Transaction({
                        type: "Outgoing",
                        amount: -amount,
                        date: currentDate,
                        cardNumber: senderCardNumber,
                        userId: receiverCard.user.toString()
                    })
                    await outcomne.save();
                    break;
                }
            } else {
            }
        }
        await senderCard.save();

        for (let card of receiverCard.cards) {
            if (card.cardNumber === receiverCardNumber) {
                card.balance += amount;
                let currentDate = new Date();
                currentDate = currentDate.toString()

                const incomne = new Transaction({
                    type: "Incoming",
                    amount: amount,
                    date: currentDate,
                    cardNumber: receiverCardNumber,
                    userId: receiverCard.user.toString()

                })

                await incomne.save();
            }

        }
        await receiverCard.save();
        sendNotification(amount, senderCardNumber, receiverCardNumber, receiverCard.user.toString());

        return res.status(200).json({
            message: "Transaction completed successfully",
            outcome: { amount: amount, cardNumber: senderCardNumber },
            income: { amount: amount, cardNumber: receiverCardNumber, userId: senderCard.user.toString() }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getTransactions = async (req, res) => {
    const { userId } = req.params;
    try {
        const transactions = await Transaction.find({ userId: userId });
        if (!transactions) {
            return res.status(404).json({ message: "Transactions tapılmadı" });
        }
        res.send(transactions);
        res.status(200).json({ message: "Transactions found", transactions: transactions });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getTransactionsByCardNumber = async (req, res) => {
    const { userId } = req.params;
    try {
        const transactionsD = await Transaction.find({ cardNumber: userId });
        if (!transactionsD) {
            return res.status(404).json({ message: "Transactions tapılmadı" });
        }
        res.send(transactionsD);


        res.status(200).json({ message: "Transactions found", transactions: transactionsD });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }

}

const getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const notifications = await Notification.find({ sender: userId });
        if (!notifications) {
            return res.status(404).json({ message: "Bildirimler tapılmadı" });
        }
        res.send(notifications);
        res.status(200).send(JSON.stringify({ notifications: "ss" })
        );
    } catch (error) {
        res.status(500).send(JSON.stringify({ message: error.message }));
    }
};

const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;

        const notification = await Notification.findByIdAndRemove(notificationId);
        if (!notification) {
            return res.status(404).json({ message: "Bildiriş tapılmadı" });
        }
        res.status(200).json({ message: "Bildiriş  silindi" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }

}
module.exports = { transferMoney, getTransactions, getUserNotifications, deleteNotification, getTransactionsByCardNumber }
