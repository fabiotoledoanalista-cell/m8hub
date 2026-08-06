import React from "react";
import { i18n } from "../../translate/i18n";
import { Avatar, CardHeader, Grid, IconButton, Tooltip } from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import CloseIcon from "@material-ui/icons/Close";

const TicketInfo = ({ contact, ticket, onClick, onToggleSearch, isSearching }) => {

	const renderCardReader = () => {
		return (
			<CardHeader
				onClick={onClick}
				style={{ cursor: "pointer" }}
				titleTypographyProps={{ noWrap: true }}
				subheaderTypographyProps={{ noWrap: true }}
				avatar={<Avatar src={contact?.urlPicture} alt="contact_image" />}
				title={`${contact?.name || '(sem contato)'} #${ticket.id}`}
				action={
					<Tooltip title={isSearching ? "Fechar busca na conversa" : "Buscar nesta conversa"}>
						<IconButton
							size="small"
							onClick={(e) => {
								e.stopPropagation();
								if (onToggleSearch) onToggleSearch();
							}}
						>
							{isSearching ? <CloseIcon fontSize="small" /> : <SearchIcon fontSize="small" />}
						</IconButton>
					</Tooltip>
				}
				subheader={
					ticket.user &&
					`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
				}

			/>
		);
	}


	return (
		<React.Fragment>
			<Grid container alignItems="center" spacing={10}>
				{/* Conteúdo do contato à esquerda */}
				<Grid item xs={6}>
					{renderCardReader()}
				</Grid>
			</Grid>
		</React.Fragment>
	);
};

export default TicketInfo;
