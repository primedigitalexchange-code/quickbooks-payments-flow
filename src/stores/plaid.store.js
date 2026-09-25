class PlaidStore {
  constructor() {
    this.items = new Map();
    this.transfers = new Map();
    this.transferEvents = new Map();
  }

  saveItem(item) {
    this.items.set(item.accessTokenReference, item);
    return item;
  }

  getItem(accessTokenReference) {
    return this.items.get(accessTokenReference);
  }

  saveTransfer(transfer) {
    const existing = this.transfers.get(transfer.id) || {};
    const nextTransfer = {
      ...existing,
      ...transfer,
      updatedAt: new Date()
    };

    this.transfers.set(nextTransfer.id, nextTransfer);
    return nextTransfer;
  }

  getTransfer(transferId) {
    return this.transfers.get(transferId);
  }

  addTransferEvent(transferId, event) {
    const currentEvents = this.transferEvents.get(transferId) || [];
    const nextEvents = currentEvents.concat({
      ...event,
      receivedAt: new Date().toISOString()
    });

    this.transferEvents.set(transferId, nextEvents);
    return nextEvents;
  }

  getTransferEvents(transferId) {
    return this.transferEvents.get(transferId) || [];
  }
}

module.exports = PlaidStore;
