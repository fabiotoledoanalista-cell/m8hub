import User from "../../models/User";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import UpdateDeletedUserOpenTicketsStatus from "../../helpers/UpdateDeletedUserOpenTicketsStatus";

const DeleteUserService = async (
  id: string | number,
  companyId: number
): Promise<void> => {
  const user = await User.findOne({
    where: { id, companyId }
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  // Protege o super admin principal do sistema contra exclusão.
  const isProtectedSuperAdmin = Boolean(user.super) || Number(user.id) === 1;
  if (isProtectedSuperAdmin) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const userOpenTickets: Ticket[] = await user.$get("tickets", {
    where: { status: "open" }
  });

  if (userOpenTickets.length > 0) {
    UpdateDeletedUserOpenTicketsStatus(userOpenTickets, companyId);
  }

  await user.destroy();
};

export default DeleteUserService;
